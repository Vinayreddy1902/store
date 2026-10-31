// Set these public, non-secret values in store-config.js before deploying.
// Never put SUPABASE_SERVICE_ROLE_KEY or PayPal secrets in browser code.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./store-config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const say=message=>{$("status").textContent=message;};
async function api(name,body){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new Error("Please sign in first.");
 const res=await fetch(SUPABASE_URL+"/functions/v1/"+name,{method:"POST",headers:{"Authorization":"Bearer "+session.access_token,"apikey":SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await res.json();if(!res.ok)throw new Error(data.error||"Request failed");return data;
}
$("login").addEventListener("submit",async e=>{
 e.preventDefault();try{const {error}=await supabase.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error)throw error;say("Signed in.");}catch(e){say(e.message);}
});
$("register").addEventListener("click",async()=>{try{const {error}=await supabase.auth.signUp({email:$("email").value,password:$("password").value});if(error)throw error;say("Check your email to confirm your account.");}catch(e){say(e.message);}});
$("signout").addEventListener("click",async()=>{await supabase.auth.signOut();say("Signed out.");});
$("buy").addEventListener("click",async()=>{
 try{
  const result=await api("create-paypal-order",{product_id:"ai_automation_blueprint"});
  // PayPal's SDK must approve the order and call capture-paypal-order afterward.
  // Never claim success before the capture endpoint returns ok.
  say("PayPal order created: "+result.order_id+". Merchant PayPal approval integration is required before payment can complete.");
 }catch(e){say(e.message);}
});
$("download").addEventListener("click",async()=>{
 try{const {url}=await api("download-product",{product_id:"ai_automation_blueprint",file_id:"ebook"});window.location.assign(url);}catch(e){say(e.message);}
});
