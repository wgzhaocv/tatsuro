#!/usr/bin/env python3
"""Single S3 PutObject to R2 via SigV4 (stdlib, UNSIGNED-PAYLOAD). For files that
exceed wrangler's 300 MiB CLI cap. Creds + args from env."""
import os, sys, hashlib, hmac, datetime, urllib.request

AK=os.environ["R2_AK"]; SK=os.environ["R2_SK"]; HOST=os.environ["R2_HOST"]
BUCKET=sys.argv[1]; KEY=sys.argv[2]; FILE=sys.argv[3]; CT=sys.argv[4] if len(sys.argv)>4 else "application/octet-stream"
REGION="auto"; SERVICE="s3"; PAYLOAD="UNSIGNED-PAYLOAD"

def sign(k,m): return hmac.new(k,m.encode(),hashlib.sha256).digest()
def sigkey(sk,ds):
    k=sign(("AWS4"+sk).encode(),ds); k=sign(k,REGION); k=sign(k,SERVICE); return sign(k,"aws4_request")

now=datetime.datetime.now(datetime.timezone.utc)
amz=now.strftime("%Y%m%dT%H%M%SZ"); ds=now.strftime("%Y%m%d")
uri="/"+BUCKET+"/"+KEY
ch=f"host:{HOST}\nx-amz-content-sha256:{PAYLOAD}\nx-amz-date:{amz}\n"
signed="host;x-amz-content-sha256;x-amz-date"
creq=f"PUT\n{uri}\n\n{ch}\n{signed}\n{PAYLOAD}"
scope=f"{ds}/{REGION}/{SERVICE}/aws4_request"
sts=f"AWS4-HMAC-SHA256\n{amz}\n{scope}\n{hashlib.sha256(creq.encode()).hexdigest()}"
sig=hmac.new(sigkey(SK,ds),sts.encode(),hashlib.sha256).hexdigest()
auth=f"AWS4-HMAC-SHA256 Credential={AK}/{scope}, SignedHeaders={signed}, Signature={sig}"

body=open(FILE,"rb").read()
req=urllib.request.Request(f"https://{HOST}{uri}", data=body, method="PUT", headers={
    "Host":HOST,"x-amz-date":amz,"x-amz-content-sha256":PAYLOAD,"Authorization":auth,
    "Content-Type":CT,"Content-Length":str(len(body))})
with urllib.request.urlopen(req, timeout=300) as r:
    print("PUT", r.status, KEY, f"{len(body)/1024/1024:.1f} MB")
