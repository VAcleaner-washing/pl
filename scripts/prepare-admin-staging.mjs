import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1]};
const projectRef=option('--project-ref');
const forbidden='yweluzclearwrazdkahu';
if(!projectRef||projectRef===forbidden||!(/^[a-z]{20}$/.test(projectRef)||projectRef==='local')){
 throw new Error('An explicit fresh staging project ref or local is required. Production is forbidden.');
}
const output=path.resolve(option('--output')||path.join(root,'staging/local'));
if(!output.startsWith(path.join(root,'staging')+path.sep))throw new Error('Output must stay inside staging/');
const catalogPath=path.join(root,'staging/catalog-snapshot.json');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
if(catalog.tables.length!==22||catalog.functions.length!==15||catalog.tables.some(t=>!t.rls))throw new Error('Unexpected canonical schema/RLS coverage');
const ident=v=>'"'+String(v).replaceAll('"','""')+'"';
const literal=v=>"'"+String(v).replaceAll("'","''")+"'";
const role=v=>v.toUpperCase()==='PUBLIC'?'PUBLIC':ident(v);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const sql=[
 '-- Generated from catalog metadata only. No production table rows, users, secrets or schedules.',
 '-- First statement refuses any database that already has VAcleaner business tables.',
 `do $guard$ begin if to_regclass('public.vacleaner_bookings') is not null or to_regclass('public.admin_users') is not null then raise exception 'R4 requires a fresh isolated database; existing business schema is forbidden'; end if; end $guard$;`,
 'set search_path = public, extensions;',
 'set check_function_bodies = false;',
 'create schema if not exists extensions;',
 'create extension if not exists pgcrypto with schema extensions;',
 'create extension if not exists "uuid-ossp" with schema extensions;',
];
for(const type of catalog.enums)sql.push(`create type public.${ident(type.name)} as enum (${type.values.map(literal).join(',')});`);
const identities=new Set(catalog.tables.flatMap(t=>t.columns.filter(c=>c.identity).map(c=>`${t.name}_${c.name}_seq`)));
for(const seq of catalog.sequences){
 if(identities.has(seq.name))continue;
 sql.push(`create sequence public.${ident(seq.name)} as ${seq.type} start ${seq.start} increment ${seq.increment} minvalue ${seq.min} maxvalue ${seq.max} cache ${seq.cache} ${seq.cycle?'cycle':'no cycle'};`);
}
for(const table of catalog.tables){
 const columns=table.columns.map(c=>{
  if(c.generated)throw new Error('Review generated-column dependency before cloning');
  return `${ident(c.name)} ${c.type}${c.identity?` generated ${c.identity==='a'?'always':'by default'} as identity`:c.default!==null?' default '+c.default:''}${c.not_null?' not null':''}`;
 });
 sql.push(`create table public.${ident(table.name)} (\n  ${columns.join(',\n  ')}\n);`);
 sql.push(`alter table public.${ident(table.name)} enable row level security;`);
 if(table.force_rls)sql.push(`alter table public.${ident(table.name)} force row level security;`);
 sql.push(`revoke all on public.${ident(table.name)} from PUBLIC, anon, authenticated, service_role;`);
}
for(const fn of catalog.functions){
 if(/net\.http|cron\.schedule|http_post\(/i.test(fn.definition))throw new Error('Outbound database code needs explicit staging isolation');
 sql.push(fn.definition.trim().replace(/;?$/,';'));
 const target=`public.${ident(fn.name)}(${fn.identity_args})`;
 sql.push(`revoke all on function ${target} from PUBLIC, anon, authenticated, service_role;`);
 for(const grant of fn.grants||[])if(grant.role!=='postgres')sql.push(`grant ${grant.privilege} on function ${target} to ${role(grant.role)};`);
}
// All keys exist before any FK; functions also exist before function-based checks.
for(const foreign of [false,true])for(const table of catalog.tables)for(const constraint of table.constraints){
 if((constraint.type==='f')!==foreign)continue;
 sql.push(`alter table public.${ident(table.name)} add constraint ${ident(constraint.name)} ${constraint.definition};`);
}
for(const table of catalog.tables){
 for(const index of table.indexes)if(!index.constraint_backed)sql.push(index.definition.replace(/;?$/,';'));
 for(const policy of table.policies){
  sql.push(`create policy ${ident(policy.name)} on public.${ident(table.name)} as ${policy.permissive} for ${policy.command} to ${policy.roles.map(role).join(',')}${policy.using?' using ('+policy.using+')':''}${policy.check?' with check ('+policy.check+')':''};`);
 }
 for(const trigger of table.triggers){
  if(trigger.enabled!=='O')throw new Error('Review nonstandard trigger before cloning');
  sql.push(trigger.definition.replace(/;?$/,';'));
 }
 for(const grant of table.grants)sql.push(`grant ${grant.privilege} on public.${ident(table.name)} to ${role(grant.role)};`);
}
sql.push('grant usage, select on all sequences in schema public to service_role;');
sql.push(`create schema vacleaner_stage; revoke all on schema vacleaner_stage from PUBLIC, anon, authenticated;`);
sql.push(`create table vacleaner_stage.identity (project_ref text primary key check(project_ref <> '${forbidden}'), created_at timestamptz not null default now());`);
sql.push('alter table vacleaner_stage.identity enable row level security;');
sql.push(`insert into vacleaner_stage.identity(project_ref) values (${literal(projectRef)});`);
// Declared synthetic resources and the checked-in catalog, never production rows.
const config=JSON.parse(fs.readFileSync(path.join(root,'config/vacleaner.json'),'utf8'));
const labels={puzzi:'R4 test Puzzi',sc2:'R4 test SC 2',jimmy:'R4 test Jimmy',abir:'R4 test ABIR'};
for(const [code,label] of Object.entries(labels))sql.push(`insert into public.vacleaner_inventory(resource_code,label,capacity,active) values (${literal(code)},${literal(label)},2,true);`);
for(const [key,value] of Object.entries({catalog:config.catalog,deposit_rules:config.depositRules,booking_slots:config.slots,delivery_fee:config.deliveryPricing})){
 sql.push(`insert into public.vacleaner_settings(key,value) values (${literal(key)},${literal(JSON.stringify(value))}::jsonb);`);
}
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'bootstrap.generated.sql'),sql.join('\n\n')+'\n');

const functions=['vacleaner-admin-bookings-v4','vacleaner-settings','vacleaner-admin-data-v1','vacleaner-extend-rental-v1','vacleaner-status-correction-v1','vacleaner-customer-documents-v1','vacleaner-prepayment-waiver-v1'];
const blocked=['vacleaner-push','vacleaner-sms-v2','vacleaner-reminders-v1','vacleaner-campaigns-v1','vacleaner-address-v1'];
const manifest={mode:'staging',projectRef,catalogSha256:sha(fs.readFileSync(catalogPath)),functions:{},blockedIntegrations:blocked};
for(const name of functions){
 const source=path.join(root,'supabase/functions',name),target=path.join(output,'supabase/functions',name);
 fs.mkdirSync(target,{recursive:true});
 const hashes={};
 for(const file of fs.readdirSync(source).filter(file=>/\.(ts|mjs)$/.test(file))){
  const data=fs.readFileSync(path.join(source,file));hashes[file]=sha(data);
  fs.writeFileSync(path.join(target,file==='index.ts'?'canonical.ts':file),data);
 }
 manifest.functions[name]=hashes;
 fs.writeFileSync(path.join(target,'index.ts'),'import "./isolation.ts";\nimport "./canonical.ts";\n');
 fs.writeFileSync(path.join(target,'isolation.ts'),`// Staging transport boundary; canonical handlers and financial modules are unchanged.\nconst expected=${JSON.stringify(projectRef)};\nconst api=new URL(Deno.env.get('SUPABASE_URL')||'http://invalid');\nif(api.hostname.includes('${forbidden}')||(expected!=='local'&&api.hostname!==expected+'.supabase.co')||(expected==='local'&&!['kong','127.0.0.1','localhost','host.docker.internal'].includes(api.hostname)))throw new Error('STAGING_TARGET_MISMATCH');\nconst blocked=new Set(${JSON.stringify(blocked)});\nconst original=globalThis.fetch.bind(globalThis);\nglobalThis.fetch=(input,init)=>{\n const url=new URL(input instanceof Request?input.url:String(input));\n const endpoint=url.pathname.match(/^\\/functions\\/v1\\/([^/]+)/)?.[1];\n if(url.origin!==api.origin||endpoint&&blocked.has(endpoint)){console.warn('STAGING_INTEGRATION_BLOCKED',url.hostname,endpoint||url.pathname);return Promise.resolve(new Response(JSON.stringify({error:'staging_integration_disabled',delivered:false}),{status:503,headers:{'Content-Type':'application/json'}}))}\n return original(input,init);\n};\n`);
}
fs.writeFileSync(path.join(output,'manifest.generated.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared isolated ${projectRef}: ${catalog.tables.length} tables, ${catalog.functions.length} SQL functions, ${functions.length} canonical Edge handlers. No network or database writes.`);
