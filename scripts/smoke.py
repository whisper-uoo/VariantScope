#!/usr/bin/env python3
"""HTTP acceptance checks against a running real database; cleans up its datasets."""
import csv,io,json,sys,urllib.request,urllib.error,uuid
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8080')+'/api'
def req(path,data=None,method=None,headers=None):
 with urllib.request.urlopen(urllib.request.Request(base+path,data=data,method=method,headers=headers or {}),timeout=60) as response:return response.read()
def upload(text):
 b='smoke'+uuid.uuid4().hex
 data=(f'--{b}\r\nContent-Disposition: form-data; name="name"\r\n\r\nSynthetic acceptance\r\n--{b}\r\nContent-Disposition: form-data; name="file"; filename="../../unsafe.vcf"\r\n\r\n'+text+f'\r\n--{b}--\r\n').encode()
 return json.loads(req('/datasets',data,headers={'Content-Type':'multipart/form-data; boundary='+b}))
def rejected(path):
 try:req(path)
 except urllib.error.HTTPError as e:assert e.code==400;return
 raise AssertionError('Expected HTTP 400')
text='##fileformat=VCFv4.2\n##source=SYNTHETIC_ACCEPTANCE\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tTEST\n1\t1\t=unsafe\tA\tG\t30\tPASS\tDP=10\tGT:DP\t0/1:10\n1\t2\trs2\tA\tT\t.\t.\t.\tGT\t./.\n2\t3\t.\tA\tAT\t50\tq10\t.\tGT\t1|0\n'
ids=[]
try:
 ds=upload(text);ids.append(ds['id']);assert ds['status']=='READY';assert ds['record_count']==3;assert ds['reference_name'] is None;id=ds['id']
 st=json.loads(req(f'/datasets/{id}/stats'));assert st['titv']==1.0;assert st['total']==3
 filtered=json.loads(req(f'/datasets/{id}/variants?chrom=1&start=1&end=1&type=SNV&minQual=20&filter=PASS&sort=pos&direction=desc&size=1'));assert filtered['total']==1;assert filtered['items'][0]['sample_value']=='0/1:10'
 p1=json.loads(req(f'/datasets/{id}/variants?size=1&page=0'));p2=json.loads(req(f'/datasets/{id}/variants?size=1&page=1'));assert p1['items'][0]['id']!=p2['items'][0]['id']
 rows=list(csv.reader(io.StringIO(req(f'/datasets/{id}/export?chrom=1').decode())));assert len(rows)==3;assert rows[1][2]=="'=unsafe"
 assert json.loads(req(f'/datasets/{id}/reanalyze',b'',method='POST'))['total']==3
 rejected(f'/datasets/{id}/variants?sort=DROP');rejected(f'/datasets/{id}/variants?size=99999');rejected(f'/datasets/{id}/stats?start=4&end=1')
 try:upload(text)
 except urllib.error.HTTPError as e:assert e.code==400
 else:raise AssertionError('Duplicate accepted')
 bad=upload(text+'bad\n');ids.append(bad['id']);assert bad['status']=='FAILED';assert bad['record_count']==0;assert '行' in bad['error']
 print('PASS: import, missing reference, genotype, combined query, pagination, stats, CSV formula escaping, reanalysis, invalid sort/range/page, duplicate, malformed import, safe upload filename, deletion cleanup')
finally:
 for id in ids:req(f'/datasets/{id}',method='DELETE')
