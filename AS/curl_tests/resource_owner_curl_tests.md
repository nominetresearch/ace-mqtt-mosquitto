# Resource Owner Tests

## Registration 

### Registering a new user

`curl --data "username=cs&password=doesthiswork?" http://127.0.0.1:3001/api/ro/register`

Result:
`{"success":"registration_success."}`

### Attempt to register with an existing username

`curl --data "username=cs&password=doesthiswork?" http://127.0.0.1:3001/api/ro/register`

Result:
`{"error":"username_already_exists."}`

## Login

### Login attempt with correct password

`curl --cookie-jar jarfile --data "username=cs&password=doesthiswork?" http://127.0.0.1:3001/api/ro/login`

Result:
`{"success":"login_success."}`

### Login attempt with incorrect password

`curl --cookie-jar jarfile --data "username=cs&password=anypass?" http://127.0.0.1:3001/api/ro/login`

Result:
`Unauthorized`

### Login attempt with incorrect username

`curl --cookie-jar jarfile --data "username=csen&password=anypass?" http://127.0.0.1:3001/api/ro/login`

Result:
`Unauthorized`

### Logout

`curl --cookie-jar jarfile http://127.0.0.1:3001/api/ro/logout` 


## Policy management

### Listing policies

`curl -i --cookie jarfile http://127.0.0.1:3001/api/ro/list_policies`

#### Policy listing result when not logged in

```http HTTP/1.1 401 Unauthorized
X-Powered-By: Express
Content-Type: text/plain; charset=utf-8
Content-Length: 12
ETag: W/"c-4G0bpw8TMen5oRPML4h9Pw"
set-cookie: connect.sid=s%3AGlgkCYWG6p-EPUU_SRebNy_rMUogsdAB.G3T73j9HlXqllpAQN%2FP%2BnQZc6Bvtzz650UyjvsL0hK0; Path=/; Expires=Mon, 27 Nov 2017 15:36:54 GMT; HttpOnly
Date: Mon, 20 Feb 2017 15:36:54 GMT
Connection: keep-alive

Unauthorized
```

#### Policy listing result when logged in but no policies

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 2
ETag: W/"2-11FxOYiYfpMxmANj4kGJzg"
Date: Mon, 20 Feb 2017 15:37:08 GMT
Connection: keep-alive

[]
```

#### Policy listing result when logged in and policies exist

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 178
ETag: W/"b2-wGA/gKSG8Nc1dzu1u3YZTw"
Date: Mon, 20 Feb 2017 15:49:49 GMT
Connection: keep-alive

[{"_id":"58ab0fa7bed30d4d3fbde02f","owner_name":"cs","resource_name":"humidity","policy_expires_at":"1970-01-18T05:14:49.200Z","scopes":["pub"]}]
```
When `client_id` is not present in the policy, this policy applies to any client.
When `resource_name` is not present in the policy, this policy applies to any resource. 



### Updating a new policy

`curl -i --cookie jarfile -H "Content-type: application/json" -X POST -d '{"resource_name":"humidity", "client_id": "Os4LjU01bbywD@2e", "scopes": ["sub","pub"], "policy_expires_at": "Mon, 20 Feb 2017 16:45:08 GMT"}' http://127.0.0.1:3001/api/ro/policy`

#### Update result when logged in

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 29
ETag: W/"1d-DNVD4NupJ34RTzE+zLXTrA"
Date: Mon, 20 Feb 2017 16:45:08 GMT
Connection: keep-alive

{"success":"Policy updated."}
```

The mongodb document becomes:

```json
{
    "_id" : ObjectId("58ab13cdbed30d4d3fbde030"),
    "owner_name" : "cs",
    "resource_name" : "humidity",
    "client_id" : "Os4LjU01bbywD@2e",
    "scopes" : [
               "sub",
               "pub"
               ],
    "policy_expires_at" : ISODate("2017-02-20T16:45:08Z")
}
```

#### Result when the policy does not exist

`curl -i --cookie jarfile -H "Content-type: application/json" -X Pidity", "client_id": "123", "scopes": ["sub","pub"], "policy_expires_at": "Mon, 20 Feb 2017 16:45:08 GMT"}' http://127.0.0.1:3001/api/ro/policy`

``` http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 29
ETag: W/"1d-DNVD4NupJ34RTzE+zLXTrA"
Date: Mon, 20 Feb 2017 16:51:24 GMT
Connection: keep-alive

{"success":"Policy updated."}
```

Update uses MongoDB upsert:

```json
{
    "_id" : ObjectId("58ab1e8c1cc92e24ccb0fdcb"),
    "client_id" : "123",
    "resource_name" : "humidity",
    "__v" : 0,
    "scopes" : [
                "sub",
                "pub"
    ],
    "policy_expires_at" : ISODate("2017-02-20T16:45:08Z"),
    "owner_name" : "cs"
}
```

#### Get, Update, Delete policy with id

The tests are similar to Get, Update, Delete resource with id.
Not discussed in further detail.
Examples are:

``
curl -i --cookie jarfile http://127.0.0.1:3001/api/ro/policy/58aef0c510847c0de79cd2e3
curl -i --cookie jarfile -X  DELETE http://127.0.0.1:3001/api/ro/policy/58aef0c510847c0de79cd2e3
curl -i --cookie jarfile -H "Content-type: application/json" -X PUT -d '{"client_id":"10.1:3001/api/ro/policy/58aef09610847c0de79cd2e2
``

## Viewing active clients with access to data

### List clients for resource owner's resources

`curl -i --cookie jarfile http://127.0.0.1:3001/api/ro/clients_sharing`

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 2
ETag: W/"2-11FxOYiYfpMxmANj4kGJzg"
Date: Mon, 20 Feb 2017 17:16:34 GMT
Connection: keep-alive

[]
```

# Introspect


``` json
{
    "active":true,
    "exp":"2017-04-22T02:14:08.959Z",
    "scope":["sub"],
    "cnf":{
        "jwk":{
            "kty":"oct",
            "alg":"HS512","k":"eVd5mLI/HNlBB9XsVXjWCQw2l74rRepIdOXVh/3ymj7Op4Wb5XbQkooOGcSsA4+VLUJwWBqg+rq9f781sgUSV31E66PfV1CXR9fdNvB61cb+5+xfFyz7CSagyB81ipB+/8Xdy1LGDekhYSZA/XmGITElrNKI4kWbw+9jGSbWJytFEN7411Gvgn0lRTBCCO2mFoAz2ymJAaIvYiJDoOCpCQ27m4gqqsWpwJAmso0fjJ73vJd6I+4Ih2oaoHAgMa0GaiOm1FJ6Hd64aFEr6wxTl5UHc1EmKlimGvaEeKWF5oQKk/h4WVY4Fu4mrD+jtnsvxCpybrSRsy4gfLI/m1Ht8RuG9fFJbM2Xe1AritafFbU5tlxXdVHzieQTrVykmDUzSQS93vX75Cgh1vG//uHiOUwtUSD/3bSAKINz7GA8RUMgqVrPxncCgcmQQy1941d+fvVWaf0IVHYsUX/ws15TZXAmuHEu7hw7PN8l1TM/Gjp+b5w1jLVrz91iw0Q6qQNzKuphK1HizN2wl4aYK8iiU4xjeA97QNaEpU2EjQ0JX76eOWYcoiImRx7QUus7thmEaWOUuQAgEQmIRbNS14O50EwyEu0DwotY9DDfap6lvO2io8BVsvH9N/fGsxoL5aJRn9SMHjvYWlGzUd74EPCfkYwhUVAe4w9uTUFTXwJCwD8="
        }
    }
}
```

For expired token:
`curl -X POST -H "Content-Type: application/json" -u 2Rrm3a@CIjtJadZG:V4dEGVFvsUAaO+UG7gFGkSH/0bejFDVLlNt16fWMfBI= -d '{"token":"BJn2zFfiRw6JKGZoNWwkWmkvKVuNPg2dtMEK4ipScm2DgGk+WlkPc/0W1YmICAtzYDcvqO0OMtVEtFAAaL8kvCJ+3+IWt5+rnSytImQWJxWMEd+B3+JWsDE76K5FusP8Rd8/H6Giv18Xcfj+ofHJ5k6+hcVsGd4N4F830VQAFvBSOBtmKu7lMd4w3hinbBKbdcK7Vn4Zhlu//K0Gd5y8cHFHoeRtLKZfuuTGHo8MaxEJK+qaNfCH+1ttrRjZIyZFIN46lyar5ZKgqojPJwJnChOjWPkmt16ECrHFI2pxiZtWJDQ/qzNUlPBKjvfpG/EQWY2XBFqq/TG+22q72BzWLQ=="}' http://127.0.0.1:3001/api/rs/introspect`

``` json
{
    "active":false
}
```
