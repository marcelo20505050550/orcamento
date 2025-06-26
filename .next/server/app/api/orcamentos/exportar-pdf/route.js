(()=>{var t={};t.id=9232,t.ids=[9232],t.modules={3295:t=>{"use strict";t.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:t=>{"use strict";t.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},29294:t=>{"use strict";t.exports=require("next/dist/server/app-render/work-async-storage.external.js")},31468:(t,e,o)=>{"use strict";o.a(t,async(t,a)=>{try{o.r(e),o.d(e,{POST:()=>n});var r=o(32190),s=o(83636),i=t([s]);async function n(t){try{let{pedidoId:e}=await t.json();if(!e)return r.NextResponse.json({error:"ID do pedido \xe9 obrigat\xf3rio"},{status:400});let o=await fetch(`http://localhost:3000/api/orcamentos/exportar?pedido=${e}`,{headers:{Authorization:t.headers.get("Authorization")||"",Cookie:t.headers.get("Cookie")||""}});if(!o.ok)return r.NextResponse.json({error:"Erro ao buscar dados do or\xe7amento"},{status:500});let a=await o.json(),i=function(t){let e=t=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(t),o=t=>{if(t.includes("/"))return t;let e=new Date(t);return isNaN(e.getTime())?t:e.toLocaleDateString("pt-BR")};return`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Or\xe7amento ${t.informacoes_gerais.codigo_orcamento}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #111827;
          background-color: #ffffff;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .header h1 {
          font-size: 2.5rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 10px;
        }
        
        .header-info p {
          font-size: 0.9rem;
          color: #4b5563;
          margin-bottom: 5px;
        }
        
        .company-info {
          text-align: right;
        }
        
        .company-info h2 {
          font-size: 1.25rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 10px;
        }
        
        .company-info p {
          font-size: 0.9rem;
          color: #4b5563;
          margin-bottom: 5px;
        }
        
        .section {
          margin-bottom: 30px;
          padding: 20px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        
        .section h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 15px;
        }
        
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .grid-item p:first-child {
          font-size: 0.875rem;
          color: #4b5563;
          margin-bottom: 5px;
        }
        
        .grid-item p:last-child {
          font-weight: 500;
          color: #111827;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        th {
          background-color: #f3f4f6;
          font-weight: 600;
          color: #111827;
        }
        
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .text-right {
          text-align: right;
        }
        
        .font-bold {
          font-weight: bold;
        }
        
        .summary {
          background-color: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin-top: 30px;
        }
        
        .summary h2 {
          font-size: 1.5rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 20px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .summary-item:last-child {
          border-bottom: none;
          font-size: 1.25rem;
          font-weight: bold;
          color: #111827;
        }
        
        .observacoes {
          margin-top: 30px;
          padding: 20px;
          background-color: #fef3c7;
          border-radius: 8px;
        }
        
        .observacoes h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 10px;
        }
        
        .observacoes ul {
          list-style-type: disc;
          padding-left: 20px;
        }
        
        .observacoes li {
          color: #92400e;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Cabe\xe7alho -->
        <div class="header">
          <div class="header-info">
            <div style="margin-bottom: 15px;">
              <h1 style="margin: 0; font-size: 2rem; color: #111827;">Or\xe7amento</h1>
            </div>
            <p><strong>C\xf3digo:</strong> ${t.informacoes_gerais.codigo_orcamento}</p>
            <p><strong>Data:</strong> ${o(t.informacoes_gerais.data_geracao)}</p>
            <p><strong>V\xe1lido at\xe9:</strong> ${o(t.informacoes_gerais.data_validade)}</p>
          </div>
          <div class="company-info">
            <h2>PROPOSTA COMERCIAL</h2>
            <p>Depto de Vendas / Or\xe7amentos - Jos\xe9 Luiz Boaventura</p>
            <p>Nossas redes sociais: @bvcaldeiraria</p>
            <p style="margin-top: 10px;">Rua Antonio Stupello, 676</p>
            <p>Telefone: (16) 99162-4446</p>
            <p>E-mail: jlboaventura@outlook.com</p>
            <p>CNPJ: 33.330.323.001-00</p>
          </div>
        </div>

        <!-- Informa\xe7\xf5es do Cliente -->
        <div class="section">
          <h2>Informa\xe7\xf5es do Cliente</h2>
          <div class="grid">
            <div class="grid-item">
              <p>Nome</p>
              <p>${t.cliente.nome}</p>
            </div>
            <div class="grid-item">
              <p>Email</p>
              <p>${t.cliente.email}</p>
            </div>
          </div>
        </div>

        <!-- Informa\xe7\xf5es do Produto -->
        <div class="section">
          <h2>Produto</h2>
          <div class="grid">
            <div class="grid-item">
              <p>Nome do Produto</p>
              <p>${t.produto.nome}</p>
            </div>
            <div class="grid-item">
              <p>Quantidade</p>
              <p>${t.produto.quantidade} unidades</p>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <p style="font-size: 0.875rem; color: #4b5563; margin-bottom: 5px;">Descri\xe7\xe3o</p>
            <p>${t.produto.descricao}</p>
          </div>
        </div>

        <!-- Materiais -->
        ${t.detalhamento.materiais.length>0?`
        <div class="section">
          <h2>Materiais</h2>
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th class="text-right">Quantidade</th>
                <th class="text-right">Pre\xe7o Unit\xe1rio</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${t.detalhamento.materiais.map(t=>`
                <tr>
                  <td>${t.nome}</td>
                  <td class="text-right">${t.quantidade}</td>
                  <td class="text-right">${e(t.preco_unitario)}</td>
                  <td class="text-right font-bold">${e(t.subtotal)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        `:""}

        <!-- Processos -->
        ${t.detalhamento.processos.length>0?`
        <div class="section">
          <h2>Processos de Fabrica\xe7\xe3o</h2>
          <table>
            <thead>
              <tr>
                <th>Processo</th>
                <th class="text-right">Quantidade</th>
                <th class="text-right">Pre\xe7o por Hora</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${t.detalhamento.processos.map(t=>`
                <tr>
                  <td>${t.nome}</td>
                  <td class="text-right">${t.quantidade}</td>
                  <td class="text-right">${e(t.preco_por_unidade)}</td>
                  <td class="text-right font-bold">${e(t.subtotal)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        `:""}

        <!-- M\xe3o de Obra -->
        ${t.detalhamento.mao_de_obra.length>0?`
        <div class="section">
          <h2>M\xe3o de Obra</h2>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th class="text-right">Horas</th>
                <th class="text-right">Pre\xe7o por Hora</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${t.detalhamento.mao_de_obra.map(t=>`
                <tr>
                  <td>${t.tipo}</td>
                  <td class="text-right">${t.horas}</td>
                  <td class="text-right">${e(t.preco_por_hora)}</td>
                  <td class="text-right font-bold">${e(t.subtotal)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        `:""}

        <!-- Itens Extras -->
        ${t.detalhamento.itens_extras.length>0?`
        <div class="section">
          <h2>Itens Extras</h2>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descri\xe7\xe3o</th>
                <th class="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${t.detalhamento.itens_extras.map(t=>`
                <tr>
                  <td>${t.nome}</td>
                  <td>${t.descricao}</td>
                  <td class="text-right font-bold">${e(t.valor)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        `:""}

        <!-- Resumo -->
        <div class="summary">
          <h2>Resumo de Custos</h2>
          <div class="summary-item">
            <span>Materiais:</span>
            <span>${e(t.resumo.custo_total_materiais)}</span>
          </div>
          <div class="summary-item">
            <span>Processos:</span>
            <span>${e(t.resumo.custo_total_processos)}</span>
          </div>
          <div class="summary-item">
            <span>M\xe3o de Obra:</span>
            <span>${e(t.resumo.custo_total_mao_de_obra)}</span>
          </div>
          <div class="summary-item">
            <span>Itens Extras:</span>
            <span>${e(t.resumo.custo_total_itens_extras)}</span>
          </div>
          <div class="summary-item">
            <span>TOTAL:</span>
            <span>${e(t.resumo.custo_total)}</span>
          </div>
        </div>

        <!-- Observa\xe7\xf5es -->
        ${t.observacoes.length>0?`
        <div class="observacoes">
          <h3>Observa\xe7\xf5es</h3>
          <ul>
            ${t.observacoes.map(t=>`<li>${t}</li>`).join("")}
          </ul>
        </div>
        `:""}
      </div>
    </body>
    </html>
  `}(a.data),n=await s.default.launch({headless:!0,args:["--no-sandbox","--disable-setuid-sandbox"]}),d=await n.newPage();await d.setContent(i,{waitUntil:"networkidle0"});let p=await d.pdf({format:"A4",printBackground:!0,margin:{top:"20px",right:"20px",bottom:"20px",left:"20px"}});return await n.close(),new r.NextResponse(p,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="Orcamento-${a.data.informacoes_gerais.codigo_orcamento}.pdf"`}})}catch(t){return console.error("Erro ao gerar PDF:",t),r.NextResponse.json({error:"Erro interno do servidor"},{status:500})}}s=(i.then?(await i)():i)[0],a()}catch(t){a(t)}})},44870:t=>{"use strict";t.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:t=>{"use strict";t.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},77430:(t,e,o)=>{"use strict";o.a(t,async(t,a)=>{try{o.r(e),o.d(e,{patchFetch:()=>p,routeModule:()=>l,serverHooks:()=>h,workAsyncStorage:()=>c,workUnitAsyncStorage:()=>m});var r=o(96559),s=o(48088),i=o(37719),n=o(31468),d=t([n]);n=(d.then?(await d)():d)[0];let l=new r.AppRouteRouteModule({definition:{kind:s.RouteKind.APP_ROUTE,page:"/api/orcamentos/exportar-pdf/route",pathname:"/api/orcamentos/exportar-pdf",filename:"route",bundlePath:"app/api/orcamentos/exportar-pdf/route"},resolvedPagePath:"C:\\Aplicativos\\saas\\src\\app\\api\\orcamentos\\exportar-pdf\\route.ts",nextConfigOutput:"",userland:n}),{workAsyncStorage:c,workUnitAsyncStorage:m,serverHooks:h}=l;function p(){return(0,i.patchFetch)({workAsyncStorage:c,workUnitAsyncStorage:m})}a()}catch(t){a(t)}})},78335:()=>{},83636:t=>{"use strict";t.exports=import("puppeteer")},96487:()=>{}};var e=require("../../../../webpack-runtime.js");e.C(t);var o=t=>e(e.s=t),a=e.X(0,[4447,580],()=>o(77430));module.exports=a})();