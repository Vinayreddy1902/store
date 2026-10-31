// Set these public, non-secret values in store-config.js before deploying.
// Never put SUPABASE_SERVICE_ROLE_KEY or PayPal secrets in browser code.
import { SUPABASE_URL, SUPABASE_ANON_KEY, PAYPAL_CLIENT_ID } from "./store-config.js";
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
async function setupPayPal(){
 if(!PAYPAL_CLIENT_ID||PAYPAL_CLIENT_ID.startsWith("YOUR_")){say("Configure PayPal client ID to enable checkout.");return;}
 const script=document.createElement("script");
 script.src="https://www.paypal.com/sdk/js?client-id="+encodeURIComponent(PAYPAL_CLIENT_ID)+"&currency=USD&intent=capture";
 script.onload=()=>{
  window.paypal.Buttons({
   createOrder:async()=>{const order=await api("create-paypal-order",{product_id:"ai_automation_blueprint"});return order.order_id;},
   onApprove:async(data)=>{try{await api("capture-paypal-order",{order_id:data.orderID});say("Verified payment complete. Your download is now available.");}catch(e){say("Payment verification pending: "+e.message);}},
   onError:()=>say("PayPal checkout could not complete. No access granted.")
  }).render("#paypal-buttons");
 };
 script.onerror=()=>say("PayPal checkout is unavailable.");
 document.head.appendChild(script);
}
setupPayPal();
$("download").addEventListener("click",async()=>{
 try{const {url}=await api("download-product",{product_id:"ai_automation_blueprint",file_id:"ebook"});window.location.assign(url);}catch(e){say(e.message);}
});
