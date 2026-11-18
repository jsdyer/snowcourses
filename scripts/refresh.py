"""Prepare manual BC snow courses and six Fraser basin automatic stations."""
from concurrent.futures import ThreadPoolExecutor
import csv
from datetime import date, datetime, timezone
import gzip
import io
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]/'web'
BASE='https://www.env.gov.bc.ca/wsd/data_searches/snow/asws/data/'
FILES=['allmss_archive.csv','allmss_current.csv','SW_DailyArchive.csv','SW.csv','SD.csv']
AUTOMATIC={'1A01P','1A02P','1A03P','1C17P','1C18P','1C29P'}


def number(value):
    if not value.strip():
        return None
    result=float(value)
    if not (0 <= result < 100000):
        return None
    return int(result) if result.is_integer() else result


def prepare(files):
    courses={}
    manual={}
    for filename in FILES[:2]:
        reader=csv.reader(io.StringIO(files[filename]))
        header=[c.strip() for c in next(reader)]
        if header[:7]!=['Snow Course Name','Number','Elev. metres','Date of Survey','Snow Depth cm','Water Equiv. mm','Survey Code']:
            raise ValueError('Manual survey columns changed')
        for row in reader:
            name,key,elevation,observed,depth,swe,flag,_,_,period=row
            observed=date.fromisoformat(observed.replace('/','-')).isoformat()
            period=period.strip().replace('June','Jun')
            if not period:
                continue
            try:
                nominal=datetime.strptime(period,'%d-%b').strftime('%m-%d')
            except ValueError as exc:
                raise ValueError('Unrecognised survey period '+period) from exc
            courses[key]={'name':name.title(),'mode':'Manual survey','elevation':number(elevation)}
            manual[key,observed,nominal]=[observed,nominal,number(depth),number(swe),flag]
    if len(courses)<250 or len(manual)<50000:
        raise ValueError('Incomplete manual archive')
    automatic={}
    for filename in FILES[2:]:
        reader=csv.reader(io.StringIO(files[filename]))
        headers=next(reader)
        if headers[0]!='DATE(UTC)':
            raise ValueError('Expected UTC station columns')
        cols={i:(h.split(' ',1)[0], h.split(' ',1)[1]) for i,h in enumerate(headers[1:],1) if h.split(' ',1)[0] in AUTOMATIC}
        if not cols:
            raise ValueError('Selected station columns are missing')
        for row in reader:
            if row[0][11:16]!='16:00':
                continue
            day=date.fromisoformat(row[0][:10]).isoformat()
            for i,(key,name) in cols.items():
                courses[key]={'name':name,'mode':'Automated station','elevation':None}
                record=automatic.setdefault((key,day),[day,day[5:],None,None,''])
                record[2 if filename=='SD.csv' else 3]=number(row[i])
    if set(k for k,day in automatic)!=AUTOMATIC:
        raise ValueError('Incomplete automated station archive')
    for station in courses.values():
        station['readings']=[]
    for (key,_,_), record in sorted(manual.items()):
        courses[key]['readings'].append(record)
    for (key,_), record in sorted(automatic.items()):
        if record[2] is not None or record[3] is not None:
            courses[key]['readings'].append(record)
    return {k:v for k,v in courses.items() if v['readings']}


def get_file(name):
    url=BASE+name
    req=Request(url,headers={'User-Agent':'CoolCode Snow Courses (+https://coolcode.ca/snowcourses/)'})
    with urlopen(req,timeout=90) as response:
        return response.read().decode('cp1252')


def update(files, path=ROOT):
    courses=prepare(files)
    data=json.dumps(courses,ensure_ascii=False,separators=(',',':')).encode()
    latest=max(r[0] for s in courses.values() for r in s['readings'] if r[2] is not None or r[3] is not None)
    status=path/'status.json'
    if status.exists() and latest < json.loads(status.read_text())['latest']:
        raise ValueError('Sources regressed to an older observation')
    packed=path/'records.json.gz'
    packed.with_suffix('.tmp').write_bytes(gzip.compress(data,mtime=0))
    packed.with_suffix('.tmp').replace(packed)
    status.write_text(json.dumps(dict(retrieved=datetime.now(timezone.utc).date().isoformat(),latest=latest,count=len(courses),readings=sum(len(s['readings']) for s in courses.values()),manual=sum(s['mode']=='Manual survey' for s in courses.values()),automated=len(AUTOMATIC)),indent=2)+'\n')


if __name__=='__main__':
    with ThreadPoolExecutor(max_workers=3) as pool:
        update(dict(zip(FILES,pool.map(get_file,FILES))))
