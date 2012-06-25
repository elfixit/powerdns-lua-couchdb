powerdns-lua-couchdb
====================

a simple couchdb backend for powerdns written in lua based on the lua backend. uses lua-spore

Installation
============

Install PowerDNS and the lua backend

Install luarocks

Install lua-spore - luarocks install lua-spore

Install luasec - luarocks install luasec

Install couchapp - pip install couchapp

Setup
=====

cd couchapp; couchapp push

run pdns_server with pdns.conf

