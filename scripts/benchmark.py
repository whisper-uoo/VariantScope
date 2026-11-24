#!/usr/bin/env python3
"""Reproducible localhost HTTP benchmark. Generated data is explicitly synthetic."""
import argparse, csv, io, json, platform, statistics, subprocess, threading, time, urllib.request, urllib.error, uuid
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:8080');p.add_argument('--records',type=int,default=100000);p.add_argument('--pid',type=int);p.add_argument('--output',default='benchmark.json');args=p.parse_args()
def request(path,data=None,headers=None,method=None):
 with urllib.request.urlopen(urllib.request.Request(args.url+'/api'+path,data=data,headers=headers or {},method=method),timeout=300) as response:return response.read()
name='synthetic-benchmark-'+str(uuid.uuid4());vcf='##fileformat=VCFv4.2\n##source=VariantScope_SYNTHETIC_BENCHMARK\n##reference=SYNTHETIC_NOT_A_REAL_ASSEMBLY\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSYNTHETIC\n'
vcf+=''.join(f'{1+i%22}\t{i+1}\tbench{i}\tA\t{"G" if i%3 else "T"}\t{i%100}\tPASS\tDP={i%60}\tGT\t0/1\n' for i in range(args.records))
boundary='VariantScope'+uuid.uuid4().hex
body=(f'--{boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n{name}\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="synthetic.vcf"\r\nContent-Type: text/plain\r\n\r\n'+vcf+f'\r\n--{boundary}--\r\n').encode()
rss=[];stop=threading.Event()
def sample():
 while not stop.is_set():
  if args.pid:
   try:rss.append(int(subprocess.check_output(['ps','-o','rss=','-p',str(args.pid)],text=True).strip()))
   except Exception:pass
  stop.wait(.1)
t=threading.Thread(target=sample);t.start();start=time.perf_counter()
try:ds=json.loads(request('/datasets',body,{'Content-Type':f'multipart/form-data; boundary={boundary}'}));elapsed=time.perf_counter()-start
finally:stop.set();t.join()
assert ds['status']=='READY',ds
id=ds['id'];times=[]
for i in range(25):
 start=time.perf_counter();result=json.loads(request(f'/datasets/{id}/variants?chrom=1&minQual=20&sort=pos&direction=asc&size=25&page=0'));times.append((time.perf_counter()-start)*1000)
assert len(result['items'])<=25
start=time.perf_counter();stats=json.loads(request(f'/datasets/{id}/stats'));statstime=(time.perf_counter()-start)*1000
assert stats['total']==args.records
out={'platform':platform.platform(),'records':args.records,'file_bytes':len(vcf.encode()),'dataset_id':id,'import_seconds':elapsed,'records_per_second':args.records/elapsed,'query_runs':len(times),'query_ms_median':statistics.median(times),'query_ms_p95':sorted(times)[int(.95*(len(times)-1))],'stats_ms':statstime,'java_rss_peak_kib':max(rss) if rss else None,'java_rss_initial_kib':rss[0] if rss else None,'sample_interval_seconds':.1,'note':'Synthetic workload; warm sequential local HTTP queries; single client; RSS includes JVM native memory; not a production capacity claim.'}
Path(args.output).write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
request(f'/datasets/{id}',method='DELETE')
