'use strict';
// Run from backend/: node ../database/import/import_inventory.cjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');
require('dotenv').config();

const root = path.resolve(__dirname, '../..');
const input = path.join(root, 'database/import/inventory.json');
const data = JSON.parse(fs.readFileSync(input, 'utf8'));
const NS = 'smart-campus-inventory-pdf-v1';
function uuid(kind, id) {
  const b = crypto.createHash('sha256').update(`${NS}:${kind}:${id}`).digest().subarray(0,16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h=b.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
function rows(name) { if (!Array.isArray(data[name])) throw new Error(`Missing sheet: ${name}`); return data[name]; }
function required(v, field) { if (v===null || v===undefined || String(v).trim()==='') throw new Error(`Missing ${field}`); return v; }
function clean(v) { return v === undefined || v === '' ? null : v; }
function int(v, field) { if (v===null || v===undefined || v==='') return null; const n=Number(v); if(!Number.isSafeInteger(n)) throw new Error(`Invalid integer ${field}: ${v}`); return n; }
function assertUnique(sheet, key) { const seen=new Set(); for(const r of rows(sheet)){const v=required(r[key], `${sheet}.${key}`); if(seen.has(v))throw new Error(`Duplicate ${sheet}.${key}: ${v}`); seen.add(v);} }
for(const [s,k] of [['Lab_Master','lab_id'],['Suppliers','supplier_id'],['Categories','category_id'],['Equipment_Models','model_id'],['Purchase_Batches','batch_id'],['Asset_Events','event_id']]) assertUnique(s,k);
const known = {
  lab: new Set(rows('Lab_Master').map(r=>r.lab_id)),
  supplier: new Set(rows('Suppliers').map(r=>r.supplier_id)),
  category: new Set(rows('Categories').map(r=>r.category_id)),
  model: new Set(rows('Equipment_Models').map(r=>r.model_id)),
  batch: new Set(rows('Purchase_Batches').map(r=>r.batch_id)),
};
function ref(kind,id,requiredRef=false){ if(!id){if(requiredRef)throw new Error(`Missing ${kind} reference`);return null;} if(!known[kind].has(id))throw new Error(`Unknown ${kind} reference ${id}`);return uuid(kind,id); }
const pool = new Pool({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}, max:2, connectionTimeoutMillis:10000});
async function main(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is missing');
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  // Serialize concurrent runs of this importer.
  await client.query("SELECT pg_advisory_xact_lock(hashtext('smart-campus-inventory-pdf-v1'))");
  for(const r of rows('Lab_Master')){
   // Capacity is NOT inferred from inventory counts; 0 means not yet configured.
   await client.query(`INSERT INTO public.labs(id,name,capacity,lab_code,investment)
    VALUES($1,$2,0,$3,$4)
    ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,lab_code=EXCLUDED.lab_code,investment=EXCLUDED.investment`,
    [uuid('lab',r.lab_id),required(r.lab_name,'lab_name'),required(r.lab_code,'lab_code'),clean(r.investment)]);
  }
  for(const r of rows('Categories')) await client.query(`INSERT INTO public.equipment_categories(id,name) VALUES($1,$2)
   ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`,[uuid('category',r.category_id),required(r.category_name,'category_name')]);
  for(const r of rows('Suppliers')) await client.query(`INSERT INTO public.suppliers(id,name,gstin,address) VALUES($1,$2,$3,$4)
   ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,gstin=EXCLUDED.gstin,address=EXCLUDED.address`,
   [uuid('supplier',r.supplier_id),required(r.supplier_name,'supplier_name'),clean(r.gstin),clean(r.address_raw)]);
  for(const r of rows('Equipment_Models')) await client.query(`INSERT INTO public.equipment_models(id,category_id,brand,model_name,config_key)
   VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET category_id=EXCLUDED.category_id,brand=EXCLUDED.brand,model_name=EXCLUDED.model_name,config_key=EXCLUDED.config_key`,
   [uuid('model',r.model_id),ref('category',r.category_id,true),clean(r.brand),required(r.model_name,'model_name'),`${r.model_id}:${r.configuration_summary||''}`]);
  for(const r of rows('Purchase_Batches')) await client.query(`INSERT INTO public.purchase_batches
   (id,acquisition_lab_id,model_id,supplier_id,register_sr_no,purchase_date,reference_no,quantity_original,quantity_current,unit_rate,total_cost,status,source_file,source_page,source_description)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
   ON CONFLICT(id) DO UPDATE SET acquisition_lab_id=EXCLUDED.acquisition_lab_id,model_id=EXCLUDED.model_id,supplier_id=EXCLUDED.supplier_id,
   register_sr_no=EXCLUDED.register_sr_no,purchase_date=EXCLUDED.purchase_date,reference_no=EXCLUDED.reference_no,
   quantity_original=EXCLUDED.quantity_original,quantity_current=EXCLUDED.quantity_current,unit_rate=EXCLUDED.unit_rate,
   total_cost=EXCLUDED.total_cost,status=EXCLUDED.status,source_file=EXCLUDED.source_file,source_page=EXCLUDED.source_page,
   source_description=EXCLUDED.source_description`,
   [uuid('batch',r.batch_id),ref('lab',r.acquisition_lab_id,true),ref('model',r.model_id,true),ref('supplier',r.supplier_id),
   String(required(r.register_sr_no,'register_sr_no')),clean(r.purchase_date),clean(r.reference_no),int(r.quantity_original,'quantity_original'),
   int(r.quantity_current,'quantity_current'),clean(r.unit_rate),clean(r.total_cost),clean(r.status),required(r.source_file,'source_file'),
   int(required(r.source_page,'source_page'),'source_page'),clean(r.source_description)]);
  for(const r of rows('Asset_Events')) await client.query(`INSERT INTO public.asset_events
   (id,batch_id,event_type,quantity_change,from_lab_id,to_lab_id,event_date,details)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET batch_id=EXCLUDED.batch_id,event_type=EXCLUDED.event_type,
   quantity_change=EXCLUDED.quantity_change,from_lab_id=EXCLUDED.from_lab_id,to_lab_id=EXCLUDED.to_lab_id,
   event_date=EXCLUDED.event_date,details=EXCLUDED.details`,
   [uuid('event',r.event_id),ref('batch',r.batch_id,true),required(r.event_type,'event_type'),int(r.quantity_change,'quantity_change')??0,
   ref('lab',r.from_lab_id),ref('lab',r.to_lab_id),clean(r.event_date),clean(r.details)]);
  const specs={
   Spec_Computers:['computer_specs',['processor','ram_gb','storage','operating_system','monitor_size_in']],
   Spec_Laptops:['laptop_specs',['processor','ram_gb','storage','operating_system','monitor_size_in']],
   Spec_Printers:['printer_specs',['functions','print_speed_ppm','resolution','connectivity','input_tray_sheets']],
   Spec_UPS:['ups_specs',['capacity_kva','dc_voltage','input_voltage_range','output_power_factor','charger_amp','battery_spec']],
   Spec_Batteries:['battery_specs',['voltage_v','capacity_ah','battery_type']],
   Spec_Projectors:['projector_specs',['technology','brightness_lumens']],
   Spec_Panels:['interactive_panel_specs',['screen_size_in','resolution','android_version','ram_gb','storage','touch_points','touch_accuracy_mm','type_c_power_w']],
  };
  for(const [sheet,[table,cols]] of Object.entries(specs)){
   for(const r of rows(sheet)){
    const names=['model_id',...cols]; const placeholders=names.map((_,i)=>`$${i+1}`).join(',');
    const updates=cols.map(c=>`${c}=EXCLUDED.${c}`).join(',');
    const sql=`INSERT INTO public.${table} (${names.join(',')}) VALUES(${placeholders}) ON CONFLICT(model_id) DO UPDATE SET ${updates}`;
    await client.query(sql,[ref('model',r.model_id,true),...cols.map(c=>clean(r[c]))]);
   }
  }
  // Serial numbers are preserved in inventory.json; not inserted as bookable resources.
  for(const r of rows('Extracted_Serials')) ref('batch',r.batch_id,true);
  const tables=['labs','suppliers','equipment_categories','equipment_models','purchase_batches','asset_events',...Object.values(specs).map(v=>v[0])];
  console.log('Counts in transaction:');
  for(const table of tables){const q=await client.query(`SELECT count(*)::int AS n FROM public.${table}`);console.log(`${table}: ${q.rows[0].n}`);}
  if(process.argv.includes('--commit')){await client.query('COMMIT');console.log('IMPORT COMMITTED');}
  else {await client.query('ROLLBACK');console.log('DRY RUN ONLY: all changes rolled back. Use --commit to import.');}
 } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
}
main().catch(e=>{console.error('IMPORT FAILED:',e.message);process.exitCode=1;}).finally(()=>pool.end());
