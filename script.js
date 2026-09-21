const $=id=>document.getElementById(id);
function showSection(id){
  document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===id));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.section===id));
  if(id==='orders') renderOrders();
  window.scrollTo({top:0,behavior:'smooth'});
}
function calculatePrice(){
  const size=$('printSize').value, qty=Math.max(1,parseInt($('quantity').value)||1), paper=$('paper').value;
  const unit=size==='a4'?(paper==='photo'?15:8):(paper==='photo'?10:5);
  $('price').textContent=unit*qty;
}
function previewImage(e){
  const f=e.target.files[0]; if(!f)return;
  const img=$('imagePreview'); img.src=URL.createObjectURL(f); img.hidden=false; $('previewPlaceholder').hidden=true;
}
function makeOrderId(){return 'CPP-'+new Date().getFullYear()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();}
function placeOrder(){
  const id=makeOrderId(), order={id,size:$('printSize').value,qty:$('quantity').value,paper:$('paper').value,price:$('price').textContent,date:new Date().toLocaleString()};
  const orders=JSON.parse(localStorage.getItem('cppOrders')||'[]'); orders.unshift(order); localStorage.setItem('cppOrders',JSON.stringify(orders));
  $('orderId').textContent=id; alert('Order तयार झाला: '+id); renderOrders();
}
function renderOrders(){
  const list=$('ordersList'), orders=JSON.parse(localStorage.getItem('cppOrders')||'[]');
  list.innerHTML=orders.length?orders.map(o=>`<div class="order-row"><div><b>${o.id}</b><br><small>${o.date} • ${o.size} • Qty ${o.qty}</small></div><strong>₹${o.price}</strong></div>`).join(''):'<div class="notice">अजून कोणताही order नाही.</div>';
}
function clearOrders(){if(confirm('सर्व local orders delete करायचे?')){localStorage.removeItem('cppOrders');renderOrders()}}
$('cardName').addEventListener('input',e=>$('cardNameText').textContent=e.target.value||'Your Name');
$('cardMobile').addEventListener('input',e=>$('cardMobileText').textContent=e.target.value||'Mobile Number');
$('cardType').addEventListener('change',e=>$('cardTypeText').textContent=e.target.value);
function cardPhotoPreview(e){const f=e.target.files[0];if(!f)return;const img=$('cardImg');img.src=URL.createObjectURL(f);img.hidden=false;img.nextElementSibling.hidden=true}
function downloadCard(){
  const c=$('cardPreview'), canvas=document.createElement('canvas'), w=840,h=480,ctx=canvas.getContext('2d');
  canvas.width=w;canvas.height=h;ctx.fillStyle='#eef5ff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#9db4d4';ctx.strokeRect(2,2,w-4,h-4);
  ctx.fillStyle='#18212f';ctx.font='bold 28px Arial';ctx.fillText($('cardTypeText').textContent,220,100);
  ctx.font='bold 38px Arial';ctx.fillText($('cardNameText').textContent,220,165);ctx.font='26px Arial';ctx.fillText($('cardMobileText').textContent,220,215);
  const img=$('cardImg');if(!img.hidden){try{ctx.drawImage(img,40,60,130,160)}catch(e){}}
  const a=document.createElement('a');a.download='chhatrapati-card.png';a.href=canvas.toDataURL('image/png');a.click();
}
let toolImage=null;
function toolPreview(e){const f=e.target.files[0];if(!f)return;toolImage=new Image();toolImage.onload=()=>{$('toolImg').src=toolImage.src;$('toolImg').hidden=false};toolImage.src=URL.createObjectURL(f)}
function resizeImage(){
  if(!toolImage){alert('पहिले image upload करा.');return}
  const w=parseInt($('toolWidth').value)||toolImage.width,h=parseInt($('toolHeight').value)||toolImage.height;
  const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(toolImage,0,0,w,h);
  const a=document.createElement('a');a.download='resized-image.png';a.href=c.toDataURL('image/png');a.click();
}
function downloadToolPNG(){
  if(!toolImage){alert('पहिले image upload करा.');return}
  const c=document.createElement('canvas');c.width=toolImage.width;c.height=toolImage.height;c.getContext('2d').drawImage(toolImage,0,0);
  const a=document.createElement('a');a.download='converted.png';a.href=c.toDataURL('image/png');a.click();
}
calculatePrice(); renderOrders();
