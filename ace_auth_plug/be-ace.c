/* 
* Copyright (c) 2017 Cigdem Sengul <cigdem.sengul@nominet.uk>
* All rights reserved.
*
* be_http.c
* Copyright (c) 2013 Jan-Piet Mens <jp@mens.de> wendal <wendal1985()gmai.com>
* All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:
*
* 1. Redistributions of source code must retain the above copyright notice,
*    this list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright
*    notice, this list of conditions and the following disclaimer in the
*    documentation and/or other materials provided with the distribution.
* 3. Neither the name of mosquitto nor the names of its
*    contributors may be used to endorse or promote products derived from
*    this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
* AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
* IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
* ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
* LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
* CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
* SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
* INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
* CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
* ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
* POSSIBILITY OF SUCH DAMAGE. 
*/

#ifdef BE_ACE
#include "backends.h"
#include "be-ace.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "hash.h"
#include "log.h"
#include "envs.h"
#include <curl/curl.h>


//Data structures for handling ACE token introspection result
struct recvData{
	char *data; 
	size_t size;
};

static struct recvData token_introspection_result;

//Callback to store token introspection result
size_t write_callback(char *ptr, size_t size, size_t nmemb, void *userdata){
	size_t real_size = size * nmemb;
	struct recvData *recv_data = (struct recvData *)userdata;

	recv_data->data = realloc(recv_data->data, recv_data->size + real_size + 1); 
	if(recv_data->data == NULL){
		_log(LOG_DEBUG, "Not enough memory\n");
		return 0;  
	} 

	memcpy(&(recv_data->data[recv_data->size]), ptr, real_size); 
	recv_data->size += real_size;
	recv_data->data[recv_data->size]=0;
	return real_size;
}

//From be-http.c: get environment parameters
static int get_string_envs(CURL *curl, const char *required_env, char *querystring){
	
	char *data = NULL;
	char *escaped_key = NULL;
	char *escaped_val = NULL;
	char *env_string = NULL;

	char *params_key[MAXPARAMSNUM];
	char *env_names[MAXPARAMSNUM];
	char *env_value[MAXPARAMSNUM];
	int i, num = 0; 

	env_string =  (char *)malloc(strlen(required_env)+20); 
	if (env_string == NULL){
		_fatal("ENOMEM");
		return(-1);
	}
	sprintf(env_string, "%s", required_env); 
	
	num = get_sys_envs(env_string, ",", "=", params_key, env_names, env_value); 
	
	for(i=0; i < num; i++){
		escaped_key = curl_easy_escape(curl, params_key[i],0); 
		escaped_val = curl_easy_escape(curl, env_value[i], 0); 
		
		_log(LOG_DEBUG, "key=%s", params_key[i]); 
		_log(LOG_DEBUG, "escaped_key=%s", escaped_key); 
		_log(LOG_DEBUG, "escaped_val=%s", escaped_val); 
		
		data = (char *)malloc(strlen(escaped_key) + strlen(escaped_val) + 1); 
		
		if (data == NULL){
			_fatal("ENOMEM"); 
			return(-1); 
		}
		sprintf(data,"%s=%s&",escaped_key, escaped_val); 
		if (i==0) {
			sprintf(querystring, "%s", data); 
		} else {
			strcat(querystring, data); 
		}
	}
	
	if(data) free(data); 
	if(escaped_key) free(escaped_key); 
	if(escaped_val) free(escaped_val); 
	free(env_string); 
	return(num); 	
}

//From be_http.c: CURL post - modified to do a token introspection
static int http_post(void *handle, char *uri, const char *clientid, const char *username, const char *password,  const char *topic, int acc, int method)
{	
	
	struct ace_backend *conf = (struct ace_backend *)handle; 
	CURL *curl; 
	struct curl_slist *headerlist=NULL;
	int re;
	int respCode = 0; 
	int ok = FALSE; 
	char *url;
	char *data; 

	//Prepare for token introspection result
	token_introspection_result.data = malloc(1); 
	token_introspection_result.size = 0;

	if (username == NULL){
		return (FALSE); 
	} 
	
	if ((curl = curl_easy_init()) == NULL) {
		_fatal("create curl_easy_handle fails"); 
		return (FALSE); 
	} 

	if (conf->hostheader != NULL)
		headerlist = curl_slist_append(headerlist, conf->hostheader); 
	headerlist = curl_slist_append(headerlist, "Expect:"); 
	
	if (conf->basic_auth != NULL) 
		headerlist = curl_slist_append(headerlist, conf->basic_auth); 

	url = (char *)malloc(strlen(conf->ip) + strlen(uri) + 20); 
	if (url == NULL){
		_fatal("ENOMEM"); 
		return (FALSE); 
	}

	//enable https if with_tls is true
	if (strcmp(conf->with_tls, "true") == 0){
		sprintf(url, "https://%s:%d%s", conf->ip, conf->port, uri);
	} else {
		sprintf(url, "http://%s:%d%s", conf->ip, conf->port, uri); 
	
	}

	//encode token to a URL encoded string
	char *escaped_username = curl_easy_escape(curl, username, 0);   

	char *string_envs = (char *)malloc(MAXPARAMSLEN); 
	if (string_envs == NULL){
		_fatal("ENOMEM"); 
		return (FALSE); 
	}
	
	memset(string_envs, 0, MAXPARAMSLEN); 
	
	//get the sys envs
	int env_num = 0; 
	if (method == METHOD_GETUSER && conf->getuser_envs != NULL){
		env_num = get_string_envs(curl, conf->getuser_envs, string_envs); 
	} 
	/*else if (method == METHOD_SUPERUSER && conf->superuser_envs != NULL) {
		env_num = get_string_envs(curl, conf->superuser_envs, string_envs); 
	} else if (method == METHOD_ACLCHECK && conf->aclcheck_envs != NULL) {
		env_num = get_string_envs(curl, conf->aclcheck_envs, string_envs); 
	}*/
	if(env_num == -1){
		return (FALSE); 
	}
	
	data = (char *)malloc(strlen(string_envs) + strlen(escaped_username) + 10); 

	if (data == NULL){
		_fatal("ENOMEM"); 
		return (FALSE);
	}

	sprintf(data, "%stoken=%s", 
		string_envs, 
		escaped_username); 

	_log(LOG_DEBUG, "url=%s", url); 
	_log(LOG_DEBUG, "data=%s", data); 
	
	//setting culr options
	curl_easy_setopt(curl, CURLOPT_URL, url); 
	curl_easy_setopt(curl, CURLOPT_POST, 1L); 
	curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data); 
	curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headerlist); 
	curl_easy_setopt(curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);   
	curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10); 
	curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback); 	
	curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&token_introspection_result); 

	re = curl_easy_perform(curl); 
	if (re == CURLE_OK){
		re = curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &respCode); 
		if (re == CURLE_OK & respCode >= 200 && respCode < 300){
			ok=TRUE;
		} else if (re == CURLE_OK && respCode >= 500){
			ok = BACKEND_ERROR; 
		} //else returns ok = FALSE and captures other error codes
	} else {
		_log(LOG_DEBUG, "http req fail url=%s re=%s", url, curl_easy_strerror(re)); 
		ok = BACKEND_ERROR; 
	}

	curl_easy_cleanup(curl); 
	curl_slist_free_all(headerlist); 
	free(url); 
	free(data);
	free(string_envs); 
	free(escaped_username);  
	return (ok); 
}

//From be_http.c: Initialize the backend, modified for ACE backend
void *be_ace_init(){
	struct ace_backend *conf; 
	char *ip; 
	char *getuser_uri;
	//char *superuser_uri;
	//char *aclcheck_uri;

	if (curl_global_init(CURL_GLOBAL_ALL) != CURLE_OK) {
		_fatal("init curl fail"); 
		return (NULL); 
	}

	if ((ip = p_stab("http_ip")) == NULL) {
		_fatal("Mandatory parameter `http_ip' missing"); 
		return (NULL); 
	}

	//Token introspection uri
	if ((getuser_uri = p_stab("http_getuser_uri")) == NULL) {
		_fatal("Mandatory parameter `http_getuser_uri' missing"); 
		return (NULL); 
	}

	/*if ((superuser_uri =p_stab("http_superuser_uri")) == NULL) {
		_fatal("Mandatory parameter `http_superuser_uri' missing"); 
		return (NULL); 
	}*/

	/*if ((aclcheck_uri = p_stab("http_aclcheck_uri")) == NULL) {
		_fatal("Mandatory parameter `http_aclcheck_uri' missing");
		return (NULL); 
	}*/

	conf = (struct ace_backend *)malloc(sizeof(struct ace_backend)); 

	conf->ip = ip; 
	conf->port = p_stab("http_port") == NULL ? 80 : atoi(p_stab("http_port")); 
	if (p_stab("http_hostname") != NULL) {
		conf->hostheader = (char *)malloc(128); 
		sprintf(conf->hostheader, "Host: %s", p_stab("http_hostname")); 
	} else {
		conf->hostheader = NULL; 
	}


	conf->getuser_uri = getuser_uri;
	//Not supported
	//conf->superuser_uri = superuser_uri;
	//conf->aclcheck_uri = aclcheck_uri;

	conf->getuser_envs = p_stab("http_getuser_params"); 
	//Not supported
	//conf->superuser_envs = p_stab("http_superuser_params"); 
	//conf->aclcheck_envs = p_stab("http_aclcheck_params"); 

	if(p_stab("http_basic_auth_key") != NULL){
		conf->basic_auth = (char *)malloc(strlen("Authorization: Basic %s") + strlen(p_stab("http_basic_auth_key"))); 
		sprintf(conf->basic_auth, "Authorization: Basic %s", p_stab("http_basic_auth_key")); 
	}	

	if(p_stab("http_with_tls") != NULL){
		conf->with_tls = p_stab("http_with_tls"); 
	} else {
		conf->with_tls = "false";
	}

	 conf->retry_count = p_stab("http_retry_count") == NULL ? 3 : atoi(p_stab("http_retry_count")); 

	_log(LOG_DEBUG, "with_tls=%s", conf->with_tls);
	_log(LOG_DEBUG, "getuser_uri=%s", getuser_uri); 
	//_log(LOG_DEBUG, "superuser_uri=%s", superuser_uri); 
	//_log(LOG_DEBUG, "aclcheck_uri=%s", aclcheck_uri); 
	_log(LOG_DEBUG, "getuser_params=%s", conf->getuser_envs); 
	//Not supported
	//_log(LOG_DEBUG, "superuser_params=%s", conf->superuser_envs); 
	//_log(LOG_DEBUG, "aclcheck_params=%s", conf->aclcheck_envs); 
	_log(LOG_DEBUG, "retry_count=%d", conf->retry_count); 

	return (conf); 
};

//From be_http.c: Clenaup/destroy (modified for ACE backend) 
void be_ace_destroy(void *handle){
	struct ace_backend *conf = (struct ace_backend *)handle;
	
	if (conf){
		curl_global_cleanup();

		free(conf); 
	}

	free(token_introspection_result.data);
};


//From be_http.c:
//Adopted for ACE
//Check the token and mac, authenticate the ACE client. 
//Username: token
//Password: mac
int be_ace_getuser(void *handle, const char *username, const char *password, char **authenticated) 
{

	struct ace_backend *conf = (struct ace_backend *)handle;
	int re, try; 

	//To parse the JSON introspection response
	char *as_result = NULL;
	const nx_json *json = NULL;
	int active = 0;
	const nx_json *jwk_obj;
	char *secret_key=NULL;
	char *alg = "sha256"; 

	//Variables to calculate the digest of the token
	unsigned char hash[EVP_MAX_MD_SIZE];
        unsigned int hash_len;
	char *encoded_hash = NULL;
	int hash_result;
        const EVP_MD *digest;
#if OPENSSL_VERSION_NUMBER < 0x10100000L
        EVP_MD_CTX context;
#else
        EVP_MD_CTX *context;
#endif

	re = BACKEND_ERROR; 
        try = 0; 

	if ((username == NULL)|| (password == NULL)){
		return re;
	}

	_log(LOG_DEBUG,"username=%s",username);
	_log(LOG_DEBUG,"password=%s",password);


	while (re == BACKEND_ERROR && try <= conf->retry_count){
		try++;
		re = http_post(handle, conf->getuser_uri, NULL,username,NULL, NULL, -1, METHOD_GETUSER); 
	}
	
	if (re == 1){
		//Default response
		re = BACKEND_DENY;
		//Check the token introspection response
		 _log(LOG_DEBUG, "ACE token introspection response: %s", token_introspection_result.data);
		//Parse the json response	
		as_result = (char *) malloc(strlen(token_introspection_result.data)); 
		memcpy(as_result, token_introspection_result.data, strlen(token_introspection_result.data)); 
		json = nx_json_parse(as_result,0);
		//Check if the token is active 
		if(json){
			active = nx_json_get(json, "active")->int_value;
			
		}

		//Parse the key in the token
		if(active){
			jwk_obj = nx_json_get(nx_json_get(json, "cnf"),"jwk");
			secret_key = (char *)nx_json_get(jwk_obj, "k")->text_value;	
			//read the algorithm from token 
			alg = (char *)nx_json_get(jwk_obj, "alg")->text_value; 
			if (strcmp(alg, "HS256") == 0)
				alg="sha256"; 
			
			
			if(secret_key){
				//Digest of the token with key - assumes sha256! 
				digest = EVP_get_digestbyname(alg);
				if(!digest){
				  fprintf(stderr, "Error: Unable to create openssl digest.\n");
				}
#if OPENSSL_VERSION_NUMBER < 0x10100000L
				EVP_MD_CTX_init(&context);
				EVP_DigestInit_ex(&context, digest, NULL);
				EVP_DigestUpdate(&context, username, strlen(username));
				EVP_DigestUpdate(&context, secret_key, strlen(secret_key));
				EVP_DigestFinal_ex(&context, hash, &hash_len);
				EVP_MD_CTX_cleanup(&context);
#else
				context = EVP_MD_CTX_new();
				EVP_DigestInit_ex(context, digest, NULL);
				EVP_DigestUpdate(context, username, strlen(username));
				EVP_DigestUpdate(context, secret_key, strlen(secret_key));
				EVP_DigestFinal_ex(context, hash, &hash_len);
				EVP_MD_CTX_free(context);
#endif
				hash_result = base64_encode(hash, hash_len, &encoded_hash);
				if(!hash_result){
					if(encoded_hash) free(encoded_hash);
				  	_log(LOG_DEBUG, "Error: Unable to encode.\n");
				} else {
				  	_log(LOG_DEBUG, "Success: encoded digested test: %s\n",encoded_hash );

					//Check if received mac matches the computed mac	
			       		if(strcmp(password,(const char*)encoded_hash) == 0 ){
						re=BACKEND_ALLOW;
						//Continue parsing token, and cache 
						//Token structure:
						//{ sub: <client_id> (assigned by AS)
						//  aud: <topic>
						//  scope: [] (pub,sub)
						//  exp: <expiration time>
						//}
						char *sub, *aud;
						const nx_json *scope_array, *scope;
						int it;
						int acc[2];
						time_t exp;

						sub = (char *)nx_json_get(json, "sub")->text_value;
						aud = (char *)nx_json_get(json, "aud")->text_value;	
						scope_array = nx_json_get(json, "scope");
						//Deal with only scope arrays of size 2
						if(scope_array->length != 2){
							_log(LOG_DEBUG, "Scope array length different than expected, will copy at most two scopes");
						} 
						int length = scope_array->length < 2 ? scope_array->length:2;
	
						//Convert pub/sub keywords to acc parameters (1=sub, 2=pub)
						for(it=0; it<length; it++){
							scope= nx_json_item(scope_array, it); 
							if(strcmp(scope->text_value, "sub") == 0){
								acc[it] = 1; 
							} else if(strcmp(scope->text_value, "pub") == 0){
								acc[it] = 2; 
							} else {
								acc[it] = 0; //unknown scope
							}
						}				

					 	exp = nx_json_get(json, "exp")->int_value;
				
						_log(LOG_DEBUG, "Caching: token %s, audience %s, exp %s", username, aud,ctime(&exp)); 
						token_cache(username, aud, acc,exp);
					} 
				}
			 } 
		} 
	} 

	if(as_result) free(as_result);
	if(json) nx_json_free(json); 
	
	return re;
}

//Not supported
int be_ace_superuser(void *handle, const char *token)
{
	return 0;
};

//From be_http.c:
//Modified to check cached token
//username: token
int be_ace_aclcheck(void *handle, const char *clientid, const char *username, const char *topic, int acc)
{
	
	int re;
	
	//read the cache to find an active token matching the token in the username 
	struct tokenParams cachedToken; 	

	re = BACKEND_ERROR;

	//The authorization for topics in token
	//acc 1 == SUB, 2 == PUB


        if(!username){
               _log(LOG_DEBUG, "Error: No username");
               return re;
        } 

	//read the cache
	cachedToken = token_cache_q(username); 
	_log(LOG_DEBUG, "Token returned: topic %s acc: %d",cachedToken.topic,cachedToken.access[0]); 


	if(cachedToken.active == 0){
		_log(LOG_DEBUG, "No active token");
		re = 0;  
	} else {
		if(strcmp(cachedToken.topic, topic)){
			_log(LOG_DEBUG, "Topic does not match cached %s request %s",cachedToken.topic,topic); 
			re = 0;
		} else {
			//We have two scopes - pub or sub
			for(int it=0; it<2;it++){
				if(cachedToken.access[it] == acc){
					re = 1;
					break; 
				}	
			}
			if(re!=1) re=0; //Re not authorized	
		}		
	} 
	return re;
}	

#endif //BE_ACE
