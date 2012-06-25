-- powerdns lua backend for couchdb usage..
-- based on the schema form ...

local pairs         = pairs
local type          = type
local logger        = logger
-- get powerdns functions
local log_critical  = log_critical
local log_error     = log_error
local log_warning   = log_warning
local log_notice    = log_notice
local log_info      = log_info
local log_debug     = log_debug
local dnspacket     = dnspacket
local getarg        = getarg
local mustdo        = mustdo

local string = require 'string'
local json = require 'json'

local sporedir
local couchdb

local r

local database      = getarg('database')
local base_url      = getarg('couchurl')
local querydesign   = getarg('querydesign')
local queryview     = getarg('queryview')
local configdir     = getarg('configdir')
local debug         = mustdo('debug')
debug = true

function init()
    -- set default values.. why the fuck can't i?
    if database == nil then
        database = 'dns'
        logger(log_debug, "(l_init)", "couchdb database not defined - set 'dns'")
    end
    if base_url == nil then
        base_url = 'http://localhost:5984/'
        logger(log_debug, "(l_init)", "couchdb base_url not defined - set 'http://localhost:5984/'")
    end
    if querydesign == nil then
        querydesign = 'dns'
        logger(log_debug, "(l_init)", "couchdb querydesign not defined - set 'dns'")
    end
    if queryview == nil then
        queryview = 'rrq'
        logger(log_debug, "(l_init)", "couchdb queryview not defined - set 'rrq'")
    end
    if configdir == nil then
        configdir = '/etc/powerdns/lua-couch/'
        logger(log_debug, "(l_init)", "couchdb configdir not defined - set '" .. configdir .. "'")
    end
    if sporedir == nil then
        sporedir = configdir .. 'spore-couch/'
        logger(log_debug, "(l_init)", "couchdb configdir not defined - set '" .. sporedir .. "'")
    end
    -- set lua-spore to debug
    if debug then
        require 'Spore'.debug = io.stdout
        logger(log_debug, "(l_init)", "couchdb lua-spore debug enabled")
    end
    
    -- setup lua-spore
    couchdb = require 'Spore'.new_from_spec(
        sporedir .. 'server.json',
        sporedir .. 'database.json',
        sporedir .. 'document.json',
        sporedir .. 'design.json',
        { base_url = base_url }
    )

    couchdb:enable_if(function (req) return req.env.spore.caller ~= 'get_attachment' end, 'Format.JSON')

    r = couchdb:get_root()
    logger(log_notice, "(l_init)", r.body.couchdb)
    logger(log_notice, "(l_init)", r.body.version)

    --logger(log_info, "(l_init)", "check/update rrq view")

end

-- helper function debug
--function printtable(table)
--  print('printtable value=',table)
--  for key, value in pairs(table) do
--    print(key, value)
--    if type(value) == type({}) then
--      printtable(value)
--    end
--  end
--end

function list(target, domain_id)
    logger(log_debug, "(l_list)", "target:", target, " domain_id:", domain_id )
    return false
end

local size, c, r, rows, res, q_type, q_name, domainid
local remote_ip, remote_port, local_ip

function lookup(qtype, qname, domain_id)
    -- querys the view
    logger(log_debug, "(l_lookup)", "qtype:", qtype, " qname:", qname, " domain_id:", domain_id )
    q_type = qtype
    q_name = qname

    r = couchdb:get_view{
            db ='dns',
            design = 'dns',
            view = 'rrq',
            key = json.encode({q_name, q_type})
        }  
    c = 0
    size = 0

    remote_ip, remote_port, local_ip = dnspacket()
    logger(log_debug, "(l_lookup) dnspacket", "remote:", remote_ip, " port:", remote_port, " local:", local_ip)

    rows = r.body.rows
    if type(rows) == "table" then
        size = #rows
    end
    logger(log_debug, "(l_lookup)", "size:", size)
end

function get()
    -- returns the result rows content
    logger(log_error, "(l_get) BEGIN")

    while c < size do
        c = c + 1
        res = rows[c].value
        if not(res.type == 'SOA') then 
            --for kk,vv in pairs(res) do
            --    logger(log_debug, "GET: ", kk, type(vv), vv)
            --end
            logger(log_debug, "return entry of type: ", res.type)
            return res 
        else
            --logger(log_notice, "(l_get) found soa but don't return soa")
        end
    end

    logger(log_debug, "(l_get) END")
    return false
end

local k,v,kk,vv
local realsoa = { hostmaster = "ahu.test.com", nameserver = "ns1.test.com", serial = 2005092501, refresh = 28800, retry = 7200, expire = 604800, default_ttl = 86400, ttl = 3600 }
local soadata

function getsoa(name)
    logger(log_debug, "(l_getsoa) BEGIN", "name:", name)
    if string.len(name) > 0 then
        r = couchdb:get_view{
            db ='dns',
            design = 'dns',
            view = 'rrq',
            key = json.encode({name, 'SOA'})
        }  
        if r.status == 200 and type(r) == "table" and #r.body.rows > 0 then
            rows = r.body.rows[1]
            soadata = rows.value.content
            logger(log_debug, "(l_getsoa) FOUND: ", type(rows), type(soadata))
            return soadata
        end
    end
    logger(log_debug, "(l_getsoa) END NOT FOUND")
end

init()
