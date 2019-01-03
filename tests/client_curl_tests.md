# Client tests

## Dynamic Client Registration

### Register a client

`curl -i -H "Content-type: application/json" -X POST -d '{"client_name":"test", "client_uri":"www.test.com"}' http://127.0.0.1:3001/api/client/dyn_client_reg`

``` http
HTTP/1.1 201 Created
X-Powered-By: Express
Cache-Control: no-store
Pragma: no-cache
Content-Type: application/json; charset=utf-8
Content-Length: 247
ETag: W/"f7-YysB+yob9rWXAMeQiHJK+g"
set-cookie: connect.sid=s%3AkZod76upNjpRfnFiDOeQVC98a6kW3Ls2.nrjN8faW%2Fl2%2BYWZUaR8CrvyhMSu90tPwTNbu9%2FvTqzg; Path=/; Expires=Mon, 04 Dec 2017 15:59:32 GMT; HttpOnly
Date: Mon, 27 Feb 2017 15:59:32 GMT
Connection: keep-alive

{"client_name":"test",
"client_uri":"www.test.com",
"client_id":"rtaWWXMRg4HkOZQS",
"client_secret":"Cu9Iho93BL45v7qJubZgR1KbB02XniTpEwfcOMfWljI=",
"client_id_issued_at":"2017-02-27T15:59:32.127Z",
"client_secret_expires_at":"2017-08-27T15:59:32.127Z"}
```

### Attempt to register client with missing metadata; and duplicates

The endpoint expects the following metadata:

* client_name
* client_uri

`curl -i  -X POST http://127.0.0.1:3001/api/client/dyn_client_reg`

``` http
HTTP/1.1 400 Bad Request
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 35
ETag: W/"23-2Z4SB/zm3cqkCpXcdEsFRA"
set-cookie: connect.sid=s%3AqXkH0ij3boWAso1WubfW1lMVecSg2udf.wR3M6u8NMeaaEeR%2FOOdV8r2gwaOWD3MjZ6VEaC9fb1Q; Path=/; Expires=Mon, 04 Dec 2017 15:50:48 GMT; HttpOnly
Date: Mon, 27 Feb 2017 15:50:48 GMT
Connection: keep-alive

{"error":"invalid_client_metadata"}
```

client_name, and all the registered URIs should be unique.
Attempting a duplicate registration will return:

``` HTTP
HTTP/1.1 500 Internal Server Error
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 37
ETag: W/"25-1aDeLb66uh8E3DCby13RRQ"
set-cookie: connect.sid=s%3AKyzVB3TOmOLEh6G_uP9of02xOmiedQob.uhEmbduTcxEl8mV7fwY9ZxaiqZv%2FJaDHzlnM0WKugoU; Path=/; Expires=Tue, 05 Dec 2017 10:55:51 GMT; HttpOnly
Date: Tue, 28 Feb 2017 10:55:51 GMT
Connection: keep-alive

{"error":"Client already registered"}
```

### GET client info

Implements basic header authentication, with client_id and client_secret.
Does not return client_secret_hash

`curl -u Uts@@w2fROSI*FAM:4wyAGSwdhFUOK4MV5XvpewXFb8Irks1ijNKKEHpb+XQ= http://127.0.0.1:3001/api/client/dyn_client_reg`

``` json
{
    "client_id":"Uts@@w2fROSI*FAM",
    "client_name":"test",
    "client_uri":"www.test.com","__v":0,
    "response_types":["token"],
    "grant_types":["client_credentials"],
    "token_endpoint_auth_method":"client_secret_basic",
    "client_secret_expires_at":"2017-08-28T09:49:01.958Z",
    "client_id_issued_at":"2017-02-28T10:49:01.958Z"
}
```

If authentication information is incorrected, response:
Unauthorized

### UPDATE client info

Cannot update client_id, client_secret, client_secret_expires_at, client_id_issued_at

An attempt would return:

``` json
{"error":"invalid_client_metadata"}
```


`curl -u Uts@@w2fROSI*FAM:4wyAGSwdhFUOK4MV5XvpewXFb8Irks1ijNKKEHpb+XQ= -H "Content-Type: application/json" -X PUT  -d '{"client_name":"test2","client_uri":"www.test.com","scope":"read"}' http://127.0.0.1:3001/api/client/dyn_client_reg`

``` json
{
    "_id":"58b555a203deb837dcef9988",
    "client_id":"Uts@@w2fROSI*FAM",
    "client_name":"test2",
    "client_uri":"www.test.com",
    "scope":"read",
    "response_types":["token"],
    "grant_types":["client_credentials"],
    "token_endpoint_auth_method":"client_secret_basic",
    "client_secret_expires_at":"2017-08-28T09:49:01.958Z",
    "client_id_issued_at":"2017-02-28T10:49:01.958Z"
}
```

# Token request

`curl -X POST -H "Content-Type: application/json" -u Eoe95HBlGUrG04yZ:364/bRL18AMD871OHIMyYKi8MbnMSMh2Qr5iTq7kK1Q= -d '{"grant_type":"client_credentials","scope":"sub","aud":"humidity"}' http://127.0.0.1:3001/api/client/token`

Here, aud (audience) and resource_name are used interchangeably. 
Need to do this better - assumes resource_names are unique across resource owners.
If they are dnsKeys, this would be correct. 

``` json
{
    "access_token":"rMFJsA0nWyycUB2S1ogpfreP8bh8YiuuMlfMNqPu65+bk8rJOuCJYRa+PNI+8FvSud/Y94z2qHfoVZZhxkVj6+fdCVQqZqgaMY0GGMRAhTi6oyrt22IAuInswjRWAMmxdF7uM3yaDHR7oezxjtbHDKIMIsU9cq1y6oRFaV8PksH5vFu8PmAJzj4GsaO/txvSv1EXSKd+fMHTQ+PnyzMLRLgTmdQA1ccQ2M/KnQBimM9dChC40iyt3PA3feLZD0f+V8Jc9TYA5XfJsdJ8Xv/i0D1v8qJkojhI9zcR/Y+qVKWyo1kTn+krn6JaozBE1QCQDTpIY4M47BW001+JkM/Qyw==",
    "profile":"mqtt_tls",
    "token_type":"pop",
    "exp":1492819108633,
    "cnf":{
        "jwk":{
            "kty":"oct",
            "alg":"HS512",
            "k":"eUE7Bp/xM9d/DxQnwF4zb+Sa3sQ69Jk7jyuuv2eoCaE7yBixiLnX8RoePJ07ex7kqp9JgY2EUf26VZSPNoqELnuhFQQ2BXdMUUq+FZ4O9dgrY0npskWPuaXySOvy8GrGVzWMiB3QL1HY48qPZqvLFaBb57JGmLHXBthwhw5AtyQV2feGnuZRk9bTKvO1DkhvMvryQF9kkOAYeEDJhk74sxJbA0zFJGytIBAR2qKPXFddRHa6/ocEYrX84vL9tLfmOhLu5UEJiyeJzYRS6c0+IZ6iQ6p4e+TLI7sm4DVGxUAu2rI5GUocMEQQk82B+C52Bq2MJS+8dbK9WuoOjpgGvL+oifJ8d+Qd/VGKcTeft6vGH0Q5s5J/FQ0K42bM7wFQMzm3GAfxSiBDLZKXBPxekGLWmPEforkKp4N6Xtqay1rUOZi75aaBWS6rt/mjxjlvLhK1s62OGKdiKmkjwDCEJRUNICgtCsGYzCw9nAmU7rosqbEk8+rSAjqVmkSgDcul2HGdjILKWdmt7NHyZZUC4q3JwyWwQ03YwQ4Mr+v5CSb60kNFHCBxTfzKHDHzOehWehFvNgTIOk1/+rc0vkLe2zBi9wKr5mfwNtwAZcG7WtPQwETcTzJIbvvEBxIXia9cR9L9g6heuP2URRFWM9G0HHCNuO0xx4uk93eXh33F3pM="
        }
    }
}
```

If scopes are incorrect:

``` json
{
    "error":"server_error",
    "error_description":"unauthorized_client"
}
```

If aud missing:

``` json
{
    "error":"server_error",
    "error_description":"invalid_request"
}
```

if grant_type is not client_credentials e.g., grant_type: client

``` json
{   "error":"unsupported_grant_type",
"error_description":"Unsupported grant type: client"
}
```

