import { createClient } from "npm:@supabase/supabase-js@2";
export function env(name: string): string {
 const value = Deno.env.get(name);
 if (!value) throw new Error("Missing server configuration: " + name);
 return value;
}
export function admin() {
 return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {auth:{persistSession:false}});
}
export async function currentUser(req: Request) {
 const header = req.headers.get("authorization") || "";
 if (!header.startsWith("Bearer ")) return null;
 const token = header.slice(7);
 const {data,error}=await admin().auth.getUser(token);
 return error ? null : data.user;
}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export const errorResponse=(status:number,message:string)=>json({error:message},status);
export function allowedOrigin(req:Request) {
 const origin=req.headers.get("origin") || "";
 return origin && origin === Deno.env.get("STOREFRONT_ORIGIN") ? origin : "";
}
export function cors(req:Request) {
 const origin=allowedOrigin(req);
 return {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
}
export function response(req:Request,body:unknown,status=200) {
 return new Response(JSON.stringify(body),{status,headers:{...cors(req),"Content-Type":"application/json","Cache-Control":"no-store"}});
}
export async function paypalAccessToken() {
 const base=env("PAYPAL_API_BASE");
 if(!["https://api-m.paypal.com","https://api-m.sandbox.paypal.com"].includes(base)) throw new Error("Invalid PayPal API base");
 const auth=btoa(env("PAYPAL_CLIENT_ID")+":"+env("PAYPAL_CLIENT_SECRET"));
 const r=await fetch(base+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});
 if(!r.ok) throw new Error("PayPal authentication failed");
 const v=await r.json();return v.access_token as string;
}
