/*
* Copyright (c) 2017 Cigdem Sengul <cigdem.sengul@nominet.uk> 
* All rights reserved. 
*
* Adopted from cache.h:
* Copyright (c) 2014 Jan-Piet Mens <jp@mens.de>
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

#include <time.h>
#include "uthash.h"
#include <openssl/sha.h>

#ifndef __TOKENCACHE_H
# define __TOKENCACHE_H

struct tokenParams{
	int active;
	char* topic;
        int access[2];
        time_t exp;
};

struct tokencache {
	//the key is the token - the size sha256
        char hex[SHA256_DIGEST_LENGTH];    
       	struct tokenParams cachedTokenParams; 
        UT_hash_handle hh;
};

static struct tokencache* cache=NULL;

void token_cache(const char *token, const char *topic, int access[2], time_t exp);
struct tokenParams token_cache_q(const char *token);

#endif
