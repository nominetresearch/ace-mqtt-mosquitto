# Overview

This folder contains a demo for the IETF draft
 MQTT-TLS profile of ACE ([https://tools.ietf.org/html/draft-sengul-ace-mqtt-tls-profile-01](https://tools.ietf.org/html/draft-sengul-ace-mqtt-tls-profile-01)).


 The demo consists of:
 1. Express Node.js based Authorisation Server (AS)
 2. Mosquitto Client extensions
 3. Mosquitto Broker auth_plugin extensions

SystemImplementation.md explains the design choices and limitations of this prototype implementation. 

Important note: To secure the AS additional steps need to be taken, which depends on the particular deployment environment. 

# Build instructions

## Running the ACE AS server

(Prerequisite: MongoDB installation - [https://docs.mongodb.com/manual/installation/](https://docs.mongodb.com/manual/installation/))

1. Inside the AS folder,  install all the dependencies:
```bash
npm install
```
3. Create a ca certificate and secret key, and place it under a folder named `app_files` (for an example for how to create
 certificates with openssl, see: [https://devcenter.heroku.com/articles/ssl-certificate-self](https://devcenter.heroku.com/articles/ssl-certificate-self))  
4. To start the server:
```bash
npm start
```
Note: Make sure your mongodb server is running before starting.

By default, this starts a server at _localhost_, _port 3001_ (in the case of http) and _port 8001_ (in the case of https) if different ports are not defined in the config file.

5. The list of configuration options in the config file _as_config.json_ are:

```json
{
  "host": "<host_address>",
  "port": "<port_number>",
  "port_https": "<https_port_number>",
  "security": {
    "tokenLife": "<time in seconds>",
    "clientSecretLife": "<time in months>",
    "sessionSecret": "<secret string>"
  },
  "mongoose":{
    "uri": "<mongodb uri>"
  }
}
```
6. Example curl tests for client and resource owner API are under _tests/_ directory. 

## Running the Mosquitto broker 

1. Prerequisite: install openssl
2. Clone mosquitto from the git repo linked at [https://mosquitto.org/download/](https://mosquitto.org/download/)  
In the `mosquitto` folder:
3. Run:
```
cmake .
```
This will create a folder called `CMakeFiles` and a file `CMakeCache.txt`.  
4. Run: 
```bash
make
```
5. This `make` may fail, if openssl installation is not in default folders. Then, in the  `CMakeCache.txt`, update the *OPENSSL_CRYPTO_LIBRARY:FILEPATH*, *OPENSSL_INCLUDE_DIR:PATH* and *OPENSSL_SSL_LIBRARY:FILEPATH* to the appropriate paths for your installation. 
6. In the `src` folder, run:
```
./mosquitto
```
to run the broker. 


## Running the mosquitto_auth_plugin
1. Clone the repository in [https://github.com/jpmens/mosquitto-auth-plug/](https://github.com/jpmens/mosquitto-auth-plug/)
2. You will use the  `ace_auth_plug` folder to patch the plugin.
3. In your `mosquitto-auth-plug` folder:  
```bash 
cp config.mk.in config.mk
```
4. Edit the `config.mk` (see the config file under `ace_auth_plug` - make sure BACKEND_MEMCACHED?=no otherwise, it throws an error) 
* Add `BACKEND_ACE ?=yes` 
* Specify `MOSQUITTO_SRC` and `OPENSSLDIR` paths. 
5. The ace_auth_plug.patch makes the following changes to the Makefile (see an example under `ace_auth_plug`):
* Add to `OBJS` the following keyword: `token-cache.o`
* Add:
```
ifneq ($(BACKEND_ACE), no)
        BACKENDS += -DBE_ACE
        BACKENDSTR += ACE

        BE_LDADD += -lcurl
        OBJS += be-ace.o nxjson.o
endif
```
* Modify  `OSSLIBS=-L$(OPENSSLDIR)/lib -lssl -lcrypto`
* Modify `auth-plug.so : $(OBJS) $(BE_DEPS) $(CC) $(CFLAGS) $(LDFLAGS) -fPIC -shared -undefined dynamic_lookup -o $@ $(OBJS) $(BE_DEPS) $(LDADD)`
* Add `token-cache.o: token-cache.h token-cache.c uthash.h Makefile`
* Add `be-ace.o: be-ace.c be-ace.h Makefile backends.h nxjson.h nxjson.c token-cache.h token-cache.c`
6. ace_auth_plug.patch also creates  `be-ace.c`, `be-ace.h`, `token-cache.c`, `token-cache.h`, `nxjson.h` and `nxjson.c` as new files. These files are also under `ace_auth_plug` folder.  
7. You can patch your folder using `ace_auth_plug.patch` or apply changes manually.  (The patch has been created against 30/01/2018 of the git repo.) 
```
    patch < ace_auth_plug.patch
```
8. Run make. 
9. After a successful `make`,  a shared object called `auth-plug.so` is created which you will reference in the `mosquitto.conf`.
So, make sure you copy/maintain `auth-plug.so` in the location referenced by the `mosquitto.conf`.
       

## Running the mosquitto broker with the auth plugin

To start the mosquitto broker at localhost:
1. Register the mosquitto broker with ACE AS server using *api/client/dyn_client_reg* endpoint (see *mqtt_ace_as/tests* folder, *client_curl_tests.md* for an example). 
This will return `client_id` and `client secret` to be used to set *auth_opt_http_basic_auth_key* in mosquitto.conf in Step 2.  
2. Update the _mosquitto.conf_ file as explained below. 
See the _mosquitto.conf_ file under this directory as an example to how to modify the configuration file. In summary:
* Set the _port_ to _8883_
* Sets the _cafile_ and/or _capath_
* Set the _certfile_
* Set the _keyfile_
* Set *tls_version* to _tlsv1.2_
* Set _require_certificate_ to _false_ (This is a client certificate requirement)
* Set *log_dest* to *stdout* (or a place of your choice)
* Set *allow_anonymous* to *false*
* Set *auth_plugin* to auth_plugin location
* Set *auth_opt_backends* to *ace*
* Set *auth_opt_http_ip* to  *127.0.0.1*
* Set *auth_opt_http_port* to  *8001* (This is where the ACE AS HTTPS endpoints run)
* Set *auth_opt_http_getuser_uri* to   */api/rs/introspect*
* Set *auth_opt_http_with_tls* true
* Set *auth_opt_http_basic_auth_key* to broker's `client_id:client secret` in base 64 encoding
2. Change to _src_ folder and run
```
./mosquitto -c ../mosquitto.conf -v
```

## Running the ACE-mosquitto clients
1. From `mosquitto_client` apply *client_shared_source.patch* and *client_shared_header.patch* in the `mosquitto/client` folder. Run make again in this folder. 
2. Register a pub and a sub client with ACE AS server using *api/client/dyn_client_reg* endpoint (see *mqtt_ace_as/tests* folder, *client_curl_tests.md* for an example). 
3. Both clients need to get an ACE access token from the AS using the *token* endpoint (see *mqtt_ace_as/tests* folder, *client_curl_tests.md* for an example). For the token endpoint to return a ticket, the resource owner must have set policies for the pub/sub client for the requested topic (see *mqtt_ace_as/tests* folder *resource_owner_curl_tests.md* for an example.)
4. If it is not already started, start the mosquitto broker; start the AS. 
5. See under client_files examples of how to call the pub/sub clients: *ace_script_pub* and *ace_script_sub* - username: token, password: PoP key
6. Start the subscriber client (see script *ace_script_sub*). Subscriber client stays connected. 
7. Start the publisher client  (see script *ace_script_pub*). Publisher client disconnects after publishing.




