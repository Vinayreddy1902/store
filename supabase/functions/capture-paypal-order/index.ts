import {admin,currentUser,env,paypalAccessToken,response,cors} from "../_shared/core.ts";
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors(req)});
 if(req.method!=="POST")return response(req,{error:"Method not allowed"},405);
 try {
 const user=await currentUser(req);if(!user)return response(req,{error:"Sign in required"},401);
 const {order_id}=await req.json();
 if(typeof order_id!=="string"||order_id.length>128)return response(req,{error:"Invalid order"},400);
 const db=admin();
 const {data:order}=await db.from("checkout_orders").select("id,product_id,status").eq("paypal_order_id",order_id).eq("user_id",user.id).single();
 if(!order)return response(req,{error:"Unknown order"},404);
 if(order.status==="paid")return response(req,{ok:true});
 const token=await paypalAccessToken();
 const base=env("PAYPAL_API_BASE");
 const cap=await fetch(base+"/v2/checkout/orders/"+encodeURIComponent(order_id)+"/capture",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json","PayPal-Request-Id":order.id}});
 // On timeout/ambiguous response, fetch order details and verify actual capture.
 const verify=await fetch(base+"/v2/checkout/orders/"+encodeURIComponent(order_id),{headers:{"Authorization":"Bearer "+token}});
 if(!verify.ok)return response(req,{error:"Payment verification pending"},503);
 const details=await verify.json();
 const unit=details.purchase_units?.[0];
 const capture=unit?.payments?.captures?.find((c:any)=>c.status==="COMPLETED");
 const {data:product}=await db.from("products").select("price_usd_cents").eq("id",order.product_id).single();
 const amount=(Number(product?.price_usd_cents||0)/100).toFixed(2);
 if(details.status!=="COMPLETED"||!capture||unit?.custom_id!==order.id||
    unit?.amount?.currency_code!=="USD"||unit?.amount?.value!==amount||
    capture.amount?.currency_code!=="USD"||capture.amount?.value!==amount)
   return response(req,{error:"Payment not verified"},409);
 // A unique provider transaction ID makes retries idempotent.
 const {error:grantError}=await db.from("entitlements").upsert({
 user_id:user.id,product_id:order.product_id,provider:"paypal",provider_transaction_id:capture.id
 },{onConflict:"provider_transaction_id",ignoreDuplicates:true});
 if(grantError)throw grantError;
 await db.from("checkout_orders").update({status:"paid"}).eq("id",order.id);
 return response(req,{ok:true});
 }catch(e){console.error("Capture failed",e);return response(req,{error:"Payment verification unavailable"},503);}
});
