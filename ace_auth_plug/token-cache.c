/* 
 * Copyright (c) 2017 Cigdem Sengul <cigdem.sengul@nominet.uk>
 * All rights reserved
 * 
 * Adopted from cache.c: 
 * Copyright (c) 2014 Jan-Piet Mens <jpmens()gmail.com>
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

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <mosquitto.h>
#include "token-cache.h"
#include <openssl/evp.h>
#include <openssl/sha.h>
#include "uthash.h"
#include "log.h"


/* access is desired read/write access
 * granted is what Mosquitto auth-plug actually granted
 */

void token_cache(const char *token, const char *topic, int access[2], time_t exp)
{
	//token length based on sha256 digest
	char hex[SHA256_DIGEST_LENGTH];
	struct tokencache *a, *tmp;
	time_t now;

	//No token, nothing to cache
	if (!token) {
                return;
        }

	//Sanity check for expiration time
	now = time(NULL);
	if (exp-now <= 0) {
		return;
	}

	_log(LOG_DEBUG, "Received parameters token: %s", token);
	_log(LOG_DEBUG, "Received parameters topic:%s", topic);
	_log(LOG_DEBUG, "Received parameters exp: %s", ctime(&exp));

	strncpy(hex, token, sizeof(hex)); 
	hex[sizeof(hex)-1]='\0';

	HASH_FIND_STR(cache, hex, a);

	if (a) {
		//all cached tokens are active
		a->cachedTokenParams.active = true;
		free(a->cachedTokenParams.topic);
		a->cachedTokenParams.topic = malloc(strlen(topic));
		strcpy(a->cachedTokenParams.topic, topic); 
		for(int i=0; i<2;i++){
			a->cachedTokenParams.access[i] = access[i];
		}
		a->cachedTokenParams.exp = exp;

	} else {
		a = (struct tokencache *)malloc(sizeof(struct tokencache));		
		strcpy(a->hex, hex);
		a->cachedTokenParams.active = true;
		a->cachedTokenParams.topic = malloc(strlen(topic));
                strcpy(a->cachedTokenParams.topic, topic);
		a->cachedTokenParams.exp = exp;
		for(int i=0; i<2;i++){
                        a->cachedTokenParams.access[i] = access[i];
                }

		HASH_ADD_STR(cache, hex, a);
		_log(LOG_DEBUG, "Token cache cached  [%s] for %s)", hex, topic);
	}

	/*
	 * Check whole cache for items which need deleting. Important with
	 * clients who show up once only (mosquitto_[sp]ub with variable clientIDs)
	 */

	HASH_ITER(hh, cache, a, tmp) {
		if (now > a->cachedTokenParams.exp) {
			_log(LOG_DEBUG, " Cleanup [%s]", a->hex);
			HASH_DEL(cache, a);
			free(a);
		}
	}
	return;
}

struct tokenParams token_cache_q(const char *token)
{
	 //token length based on sha256
        char hex[SHA256_DIGEST_LENGTH];
	struct tokencache *a;

	struct tokenParams resultToken;
	resultToken.active = 0;


	if (!token) {
		return resultToken;
	}

	strncpy(hex, token, sizeof(hex));
        hex[sizeof(hex)-1]='\0';

	_log(LOG_DEBUG, "Token to check %s", hex); 

	HASH_FIND_STR(cache, hex, a);
	if (a) {
		// printf("---> CACHED! %d\n", a->granted);

		if (time(NULL) > a->cachedTokenParams.exp) {
			_log(LOG_DEBUG, " Expired [%s]", hex);
			HASH_DEL(cache, a);
			free(a);
		} else {
			resultToken.active = a->cachedTokenParams.active;
			resultToken.topic = malloc(strlen(a->cachedTokenParams.topic));
			strcpy(resultToken.topic, a->cachedTokenParams.topic);
			resultToken.exp = a->cachedTokenParams.exp;
			for(int i=0; i<2;i++){
                        	resultToken.access[i]=a->cachedTokenParams.access[i];
                	}	
		}
	} else {
		_log(LOG_DEBUG,"No token found in cache");
	}

	return resultToken;
}


