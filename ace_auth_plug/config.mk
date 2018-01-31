# Select your backends from this list
BACKEND_CDB ?= no
BACKEND_MYSQL ?= no
BACKEND_SQLITE ?= no
BACKEND_REDIS ?= no
BACKEND_POSTGRES ?= no
BACKEND_LDAP ?= no
BACKEND_HTTP ?= yes
BACKEND_JWT ?= yes
BACKEND_MONGO ?= no
#Cigdem: ACE
BACKEND_ACE ?= yes
BACKEND_MEMCACHED?=no

# Specify the path to the Mosquitto sources here
MOSQUITTO_SRC = /Users/cigdem/Development/mqtt-trials/mosquitto
# Specify the path the OpenSSL here
OPENSSLDIR = /usr/local/Cellar/openssl/1.0.2e
