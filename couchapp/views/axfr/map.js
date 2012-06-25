function isArray(obj) {
    if (obj.constructor.toString().indexOf("Array") == -1)
        return false;
    else
        return true;
}

/*
 * CouchDB view for AXFR for the couch-sdb BIND SDB driver by
 * Jan-Piet Mens.
 */

function (doc) 
{
    if (doc.type == 'zone') {

        var zonettl = doc.default_ttl ? doc.default_ttl : 86400;

        // SOA
        var soa         = doc.soa;
        var nameserver  = (soa.nameserver)  ? soa.nameserver    : 'dns.' + doc.zone;
        var hostmaster  = (soa.hostmaster)  ? soa.hostmaster    : 'hostmaster.' + doc.zone;
        var serial      = (soa.serial)      ? soa.serial        : doc['_rev'].replace(/-.*/, "");

        emit( doc.zone, {
            order       : 0,
            name        : '@',
            type        : 'SOA',
            ttl         : zonettl,
            nameserver  : nameserver,
            hostmaster  : hostmaster,
            serial      : serial
            });

        // NS
        if (doc.ns && doc.ns.length > 0) {
            doc.ns.forEach( function(addr) { 

                emit(doc.zone, {
                    orderv  : 1,
                    name    : '@',
                    type    : 'NS',
                    ttl     : zonettl,
                    content : addr
                    });
            });
        }

        if (doc.rr && doc.rr.length > 0) {
            for (var i = 0; i < doc.rr.length; i++) {
                var rr = doc.rr[i];
                var ttl = (rr.ttl) ? rr.ttl : zonettl;

                /* If `content` is an array of values, we have to
                 * emit individual resource records (RR) 
                 */

                if (isArray(rr.content) == true) {
                    doc.rr[i].content.forEach( function(d) {
                        emit(doc.zone, {
                            order   : 2,
                            name    : rr.name,
                            type    : rr.type.toUpperCase(),
                            ttl     : ttl,
                            content : d,
                        });
                    });
                } else {
                    emit(doc.zone, {
                        order   : 2,
                        name    : rr.name,
                        type    : rr.type.toUpperCase(),
                        ttl     : ttl,
                        content : rr.content,
                    });
                }
            }
        }

    }
}
