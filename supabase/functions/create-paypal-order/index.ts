import {admin,currentUser,env,paypalAccessToken,response,cors,trustedRequest} from "../_shared/core.ts";
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors(req)});
 if(!trustedRequest(req))return response(req,{error:"Origin not allowed"},403);
 if(req.method!=="POST")return response(req,{error:"Method not allowed"},405);
 try {
 const user=await currentUser(req);
 if(!user)return response(req,{error:"Sign in required"},401);
 const {product_id}=await req.json();
 if(typeof product_id!=="string")return response(req,{error:"Invalid product"},400);
 const db=admin();
 const {data:product,error}=await db.from("products").select("id,price_usd_cents,paypal_enabled").eq("id",product_id).single();
 if(error||!product?.paypal_enabled)return response(req,{error:"Product unavailable"},404);
 const {data:order,error:insertError}=await db.from("checkout_orders").insert({user_id:user.id,product_id}).select("id").single();
 if(insertError||!order)throw new Error("Could not create checkout record");
 const token=await paypalAccessToken();
 const base=env("PAYPAL_API_BASE");
 const r=await fetch(base+"/v2/checkout/orders",{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json","PayPal-Request-Id":order.id},body:JSON.stringify({intent:"CAPTURE",purchase_units:[{reference_id:order.id,custom_id:order.id,amount:{currency_code:"USD",value:(product.price_usd_cents/100).toFixed(2)}}]})});
 if(!r.ok)throw new Error("PayPal order creation failed");
 const p=await r.json();
 const {error:updateError}=await db.from("checkout_orders").update({paypal_order_id:p.id}).eq("id",order.id).eq("status","pending");
 if(updateError)throw new Error("Checkout persistence failed");
 return response(req,{order_id:p.id});
 }catch(e){console.error("Checkout creation failed",e);return response(req,{error:"Checkout unavailable"},503);}
});
