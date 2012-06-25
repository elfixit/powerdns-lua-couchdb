function isArray(obj) {
    if (obj.constructor.toString().indexOf("Array") == -1)
        return false;
    else
        return true;
}

/*
 * CouchDB view for rr queries original from Jan-Piet Mens. form:
 * http://jpmens.net/2010/05/03/dns-backed-by-couchdb-redux/
 */

function (doc) {
    if (doc.type == 'zone') {
        var zonettl = doc.default_ttl ? doc.default_ttl : 86400;

        // SOA
        var soa = doc.soa;
        var nameserver  = (soa.nameserver)  ? soa.nameserver: 'dns.' + doc.zone;
        var hostmaster  = (soa.hostmaster)  ? soa.hostmaster: 'hostmaster.' + doc.zone;
        var serial      = (soa.serial)      ? soa.serial    : doc['_rev'].replace(/-.*/, "");
        var refresh     = (soa.refresh)     ? soa.refresh   : 86400;
        var retry       = (soa.retry)       ? soa.retry     : 7200;
        var expire      = (soa.expire)      ? soa.expire    : 3600000;
        var minimum     = (soa.minimum)     ? soa.minimum   : 172800;
        emit([ doc.zone, 'SOA' ], {
            type : 'SOA',
            ttl  : zonettl,
            content : {
                nameserver  : nameserver,
                hostmaster  : hostmaster,
                serial      : serial,
                refresh     : refresh,
                retry       : retry,
                expire      : expire,
                minimum     : minimum
            }
        });
        emit([ doc.zone, 'ANY' ], {
            type : 'SOA',
            ttl  : zonettl,
            content : {
                nameserver  : nameserver,
                hostmaster  : hostmaster,
                serial      : serial,
                refresh     : refresh,
                retry       : retry,
                expire      : expire,
                minimum     : minimum
            }
        });

        // NS
        if (doc.ns && doc.ns.length > 0) {
            doc.ns.forEach( function(addr) {
                emit([doc.zone, 'NS'], {
                    name    : doc.zone,
                    type    : 'NS',
                    ttl     : zonettl,
                    content : addr
                });
                emit([doc.zone, 'ANY'], {
                    name    : doc.zone,
                    type    : 'NS',
                    ttl     : zonettl,
                    content : addr
                });
            });
        }

        // RRecords
        if (doc.rr && doc.rr.length > 0) {
            for (var i = 0; i < doc.rr.length; i++) {
                var rr = doc.rr[i];
                var ttl = (rr.ttl) ? rr.ttl : zonettl;
                var fqdn = (rr.name) ? rr.name + '.' : '';
                fqdn += doc.zone;
                if (isArray(rr.content)) {
                    rr.content.forEach( function(content) {
                        emit([ fqdn, rr.type ], {
                            name    : fqdn,
                            type    : rr.type.toUpperCase(),
                            content : content,
                            ttl     : ttl,
                        })
                        emit([ fqdn, 'ANY' ], {
                            name    : fqdn,
                            type    : rr.type.toUpperCase(),
                            content : content,
                            ttl     : ttl,
                        })
                    })
                } else {
                    emit([ fqdn, rr.type ], {
                        name    : fqdn,
                        type    : rr.type.toUpperCase(),
                        content : rr.content,
                        ttl     : ttl,
                    });
                    emit([ fqdn, 'ANY' ], {
                        name    : fqdn,
                        type    : rr.type.toUpperCase(),
                        content : rr.content,
                        ttl     : ttl,
                    });
                }
            }
        }

        // PTR
        if (doc.rr && doc.rr.length > 0) {
            // Cycle through array of Resource Records
            doc.rr.forEach( function(rr) {
                if (rr.type == 'a') {
                    var ttl = rr.ttl ? rr.ttl : doc.default_ttl;
                    ttl = (ttl) ? ttl : 9845;

                    // Cycle through array of IP addresses in A RR
                    rr.content.forEach( function(addr) {
                        var ip = addr.split('.');
                        var rev = ip[3]+'.'+ip[2]+'.'+ip[1]+'.'+ip[0];
                        var revname = rev + '.in-addr.arpa';
                        emit( [ revname, 'ptr' ], {
                            name    : revname,
                            type    : 'ptr'.toUpperCase(),
                            content : rr.name + '.' + doc.zone,
                            ttl     : ttl
                        });
                    });
                }
            });
        }
    }
}
