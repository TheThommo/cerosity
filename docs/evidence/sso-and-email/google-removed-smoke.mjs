import { chromium, devices } from "playwright";
const BASE="https://cerosity.com";
const OUT=process.env.OUT;
const results=[];
const rec=(s,p,d)=>{results.push({s,p,d});console.log(`${p?"PASS":"FAIL"}  ${s}\n      ${d}`);};
const health=await (await fetch(`${BASE}/api/health`)).json();
console.log(`\nTarget ${BASE} @ ${health.commit}  390x844\n`);
const b=await chromium.launch();
const c=await b.newContext({...devices["iPhone 13"],viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const p=await c.newPage();

for (const [path,label] of [["/login","sign-in"],["/signup","sign-up"]]) {
  await p.goto(BASE+path,{waitUntil:"domcontentloaded"});
  await p.waitForTimeout(2500);
  const txt=await p.locator("body").innerText();
  const googleBtns=await p.getByRole("button",{name:/google/i}).count();
  const googleLinks=await p.getByRole("link",{name:/google/i}).count();
  rec(`${label}: no Google control`, googleBtns===0&&googleLinks===0, `buttons=${googleBtns} links=${googleLinks}`);
  rec(`${label}: no "with Google" text`, !/with Google/i.test(txt), /with Google/i.test(txt)?"still present":"absent");
  rec(`${label}: no "or sign in/up with email" divider`, !/or sign (in|up) with email/i.test(txt), "divider gone");
  await p.screenshot({path:`${OUT}/0${path==="/login"?1:2}-${label}-no-google.png`});
}

// The email form is still the way in.
await p.goto(BASE+"/login",{waitUntil:"domcontentloaded"});
await p.waitForTimeout(2000);
const pw=await p.locator('input[type="password"]').count();
const forgot=await p.getByRole("link",{name:/forgot password/i}).count();
rec("sign-in still has the email form + Forgot password?", pw>0&&forgot>0, `password inputs=${pw} forgot links=${forgot}`);

// Server route deliberately left in place, still unconfigured.
const g=await p.request.get(`${BASE}/api/auth/google`,{failOnStatusCode:false,maxRedirects:0});
rec("server Google route left in place and still unconfigured", g.status()===501, `HTTP ${g.status()} · ${(await g.text()).slice(0,60)}`);

// forgot-password still answers generically after the email change.
const f=await p.request.post(`${BASE}/api/auth/forgot-password`,{data:{email:"probe-no-account-7781@example.invalid"},failOnStatusCode:false});
rec("forgot-password still returns the generic sentence", f.status()===200, `HTTP ${f.status()} · ${(await f.json()).message}`);

await b.close();
const failed=results.filter(r=>!r.p);
console.log(`\n${results.length-failed.length}/${results.length} passed @ ${health.commit}`);
if(failed.length) process.exit(1);
