import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(request: NextRequest) {
  try {
    const { pedidoId } = await request.json()
    
    if (!pedidoId) {
      return NextResponse.json({ error: 'ID do pedido é obrigatório' }, { status: 400 })
    }

    // Buscar dados do orçamento usando a API interna
    const response = await fetch(`http://localhost:3000/api/orcamentos/exportar?pedido=${pedidoId}`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      }
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Erro ao buscar dados do orçamento' }, { status: 500 })
    }

    const orcamentoData = await response.json()

    // Gerar HTML do orçamento
    const html = generateOrcamentoHTML(orcamentoData.data)

    // Usar Puppeteer para gerar PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    })
    
    await browser.close()

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Orcamento-${orcamentoData.data.informacoes_gerais.codigo_orcamento}.pdf"`
      }
    })

  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

interface OrcamentoData {
  informacoes_gerais: {
    codigo_orcamento: string;
    data_geracao: string;
    data_validade: string;
  };
  cliente: {
    nome: string;
    email: string;
  };
  produto: {
    nome: string;
    descricao: string;
    quantidade: number;
  };
  detalhamento: {
    materiais: Array<{ nome: string; quantidade: number; preco_unitario: number; subtotal: number }>;
    processos: Array<{ nome: string; quantidade: number; preco_por_unidade: number; subtotal: number }>;
    mao_de_obra: Array<{ tipo: string; horas: number; preco_por_hora: number; subtotal: number }>;
    itens_extras: Array<{ nome: string; descricao: string; valor: number }>;
  };
  resumo: {
    custo_total_materiais: number;
    custo_total_processos: number;
    custo_total_mao_de_obra: number;
    custo_total_itens_extras: number;
    custo_total: number;
  };
  observacoes: string[];
}

function generateOrcamentoHTML(orcamento: OrcamentoData): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    // Verifica se a data já está formatada (contém barras)
    if (dateString.includes('/')) {
      return dateString
    }
    
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString // Retorna a string original se não conseguir parsear
    }
    
    return date.toLocaleDateString('pt-BR')
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Orçamento ${orcamento.informacoes_gerais.codigo_orcamento}</title>
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
        <!-- Cabeçalho -->
        <div class="header">
          <div class="header-info">
            <div style="margin-bottom: 15px;">
              <h1 style="margin: 0; font-size: 2rem; color: #111827;">Orçamento</h1>
            </div>
            <p><strong>Código:</strong> ${orcamento.informacoes_gerais.codigo_orcamento}</p>
            <p><strong>Data:</strong> ${formatDate(orcamento.informacoes_gerais.data_geracao)}</p>
            <p><strong>Válido até:</strong> ${formatDate(orcamento.informacoes_gerais.data_validade)}</p>
          </div>
          <div class="company-info">
            <h2>PROPOSTA COMERCIAL</h2>
            <p>Depto de Vendas / Orçamentos - José Luiz Boaventura</p>
            <p>Nossas redes sociais: @bvcaldeiraria</p>
            <p style="margin-top: 10px;">Rua Antonio Stupello, 676</p>
            <p>Telefone: (16) 99162-4446</p>
            <p>E-mail: jlboaventura@outlook.com</p>
            <p>CNPJ: 33.330.323.001-00</p>
          </div>
        </div>

        <!-- Informações do Cliente -->
        <div class="section">
          <h2>Informações do Cliente</h2>
          <div class="grid">
            <div class="grid-item">
              <p>Nome</p>
              <p>${orcamento.cliente.nome}</p>
            </div>
            <div class="grid-item">
              <p>Email</p>
              <p>${orcamento.cliente.email}</p>
            </div>
          </div>
        </div>

        <!-- Informações do Produto -->
        <div class="section">
          <h2>Produto</h2>
          <div class="grid">
            <div class="grid-item">
              <p>Nome do Produto</p>
              <p>${orcamento.produto.nome}</p>
            </div>
            <div class="grid-item">
              <p>Quantidade</p>
              <p>${orcamento.produto.quantidade} unidades</p>
            </div>
          </div>
          <div style="margin-top: 15px;">
            <p style="font-size: 0.875rem; color: #4b5563; margin-bottom: 5px;">Descrição</p>
            <p>${orcamento.produto.descricao}</p>
          </div>
        </div>

        <!-- Materiais -->
        ${orcamento.detalhamento.materiais.length > 0 ? `
        <div class="section">
          <h2>Materiais</h2>
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th class="text-right">Quantidade</th>
                <th class="text-right">Preço Unitário</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${orcamento.detalhamento.materiais.map((material) => `
                <tr>
                  <td>${material.nome}</td>
                  <td class="text-right">${material.quantidade}</td>
                  <td class="text-right">${formatCurrency(material.preco_unitario)}</td>
                  <td class="text-right font-bold">${formatCurrency(material.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Processos -->
        ${orcamento.detalhamento.processos.length > 0 ? `
        <div class="section">
          <h2>Processos de Fabricação</h2>
          <table>
            <thead>
              <tr>
                <th>Processo</th>
                <th class="text-right">Quantidade</th>
                <th class="text-right">Preço por Hora</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${orcamento.detalhamento.processos.map((processo) => `
                <tr>
                  <td>${processo.nome}</td>
                  <td class="text-right">${processo.quantidade}</td>
                  <td class="text-right">${formatCurrency(processo.preco_por_unidade)}</td>
                  <td class="text-right font-bold">${formatCurrency(processo.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Mão de Obra -->
        ${orcamento.detalhamento.mao_de_obra.length > 0 ? `
        <div class="section">
          <h2>Mão de Obra</h2>
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th class="text-right">Horas</th>
                <th class="text-right">Preço por Hora</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${orcamento.detalhamento.mao_de_obra.map((maoDeObra) => `
                <tr>
                  <td>${maoDeObra.tipo}</td>
                  <td class="text-right">${maoDeObra.horas}</td>
                  <td class="text-right">${formatCurrency(maoDeObra.preco_por_hora)}</td>
                  <td class="text-right font-bold">${formatCurrency(maoDeObra.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Itens Extras -->
        ${orcamento.detalhamento.itens_extras.length > 0 ? `
        <div class="section">
          <h2>Itens Extras</h2>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                <th class="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${orcamento.detalhamento.itens_extras.map((item) => `
                <tr>
                  <td>${item.nome}</td>
                  <td>${item.descricao}</td>
                  <td class="text-right font-bold">${formatCurrency(item.valor)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Resumo -->
        <div class="summary">
          <h2>Resumo de Custos</h2>
          <div class="summary-item">
            <span>Materiais:</span>
            <span>${formatCurrency(orcamento.resumo.custo_total_materiais)}</span>
          </div>
          <div class="summary-item">
            <span>Processos:</span>
            <span>${formatCurrency(orcamento.resumo.custo_total_processos)}</span>
          </div>
          <div class="summary-item">
            <span>Mão de Obra:</span>
            <span>${formatCurrency(orcamento.resumo.custo_total_mao_de_obra)}</span>
          </div>
          <div class="summary-item">
            <span>Itens Extras:</span>
            <span>${formatCurrency(orcamento.resumo.custo_total_itens_extras)}</span>
          </div>
          <div class="summary-item">
            <span>TOTAL:</span>
            <span>${formatCurrency(orcamento.resumo.custo_total)}</span>
          </div>
        </div>

        <!-- Observações -->
        ${orcamento.observacoes.length > 0 ? `
        <div class="observacoes">
          <h3>Observações</h3>
          <ul>
            ${orcamento.observacoes.map((obs: string) => `<li>${obs}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
    </body>
    </html>
  `
} 