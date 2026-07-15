#!/usr/bin/env python3
"""Exact R2 usage via S3 ListObjectsV2 + SigV4 (stdlib only). Creds from env."""
import os, sys, hashlib, hmac, datetime, urllib.request, urllib.parse
import xml.etree.ElementTree as ET

AK = os.environ["R2_AK"]; SK = os.environ["R2_SK"]
HOST = os.environ["R2_HOST"]                    # <acct>.r2.cloudflarestorage.com
REGION = "auto"; SERVICE = "s3"
EMPTY = hashlib.sha256(b"").hexdigest()

def sign(key, msg): return hmac.new(key, msg.encode(), hashlib.sha256).digest()
def sigkey(sk, ds):
    k = sign(("AWS4"+sk).encode(), ds)
    k = sign(k, REGION); k = sign(k, SERVICE); return sign(k, "aws4_request")

def get(bucket, token):
    params = {"list-type": "2", "max-keys": "1000"}
    if token: params["continuation-token"] = token
    qs = "&".join(f"{urllib.parse.quote(k, safe='')}={urllib.parse.quote(v, safe='')}"
                  for k, v in sorted(params.items()))
    uri = "/" + urllib.parse.quote(bucket)
    now = datetime.datetime.now(datetime.timezone.utc)   # only used for signing scope
    amzdate = now.strftime("%Y%m%dT%H%M%SZ"); datestamp = now.strftime("%Y%m%d")
    canon_headers = f"host:{HOST}\nx-amz-content-sha256:{EMPTY}\nx-amz-date:{amzdate}\n"
    signed = "host;x-amz-content-sha256;x-amz-date"
    creq = f"GET\n{uri}\n{qs}\n{canon_headers}\n{signed}\n{EMPTY}"
    scope = f"{datestamp}/{REGION}/{SERVICE}/aws4_request"
    sts = f"AWS4-HMAC-SHA256\n{amzdate}\n{scope}\n{hashlib.sha256(creq.encode()).hexdigest()}"
    sig = hmac.new(sigkey(SK, datestamp), sts.encode(), hashlib.sha256).hexdigest()
    auth = (f"AWS4-HMAC-SHA256 Credential={AK}/{scope}, "
            f"SignedHeaders={signed}, Signature={sig}")
    req = urllib.request.Request(f"https://{HOST}{uri}?{qs}", method="GET", headers={
        "Host": HOST, "x-amz-date": amzdate, "x-amz-content-sha256": EMPTY, "Authorization": auth})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def tally(bucket):
    ns = "{http://s3.amazonaws.com/doc/2006-03-01/}"
    total = 0; n = 0; token = None
    while True:
        root = ET.fromstring(get(bucket, token))
        for c in root.findall(f"{ns}Contents"):
            total += int(c.find(f"{ns}Size").text); n += 1
        trunc = root.find(f"{ns}IsTruncated")
        if trunc is not None and trunc.text == "true":
            token = root.find(f"{ns}NextContinuationToken").text
        else:
            break
    return n, total

gb = lambda b: b/1024/1024/1024
grand = 0
for b in ("yamashita-tatsuro", "yamashita-mv"):
    n, t = tally(b); grand += t
    print(f"{b:20} {n:>5} 对象   {gb(t):.3f} GB")
print(f"{'合计':20} {'':>5}          {gb(grand):.3f} GB / 10 GB 免费")
print(f"真实剩余 ≈ {10-gb(grand):.2f} GB")
