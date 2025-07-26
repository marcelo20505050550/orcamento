'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Cliente, Produto, ImpostoPedido } from '@/types'
import './print.css'

type PedidoDetalhes = {
  id: string
  cliente_id: string
  quantidade: number
  status: 'pendente' | 'em_producao' | 'finalizado' | 'cancelado'
  observacoes?: string
  tem_frete: boolean
  valor_frete: number
  created_at: string
  updated_at: string
  cliente?: Cliente
  produtos_pedido?: Array<{
    id: string
    produto_id: string
    quantidade: number
    produto: {
      id: string
      nome: string
      preco_unitario: number
      custo_total?: number
    }
  }>
}

export default function ExportarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const pedidoId = use(params).id

  const [pedido, setPedido] = useState<PedidoDetalhes | null>(null)
  const [impostos, setImpostos] = useState<ImpostoPedido[]>([])
  const [produtosSelecionados, setProdutosSelecionados] = useState<{ id: string, nome: string, custoTotal: number, quantidade: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDados = async () => {
      setLoading(true)
      try {
        // Buscar detalhes do pedido
        const pedidoResponse = await api.get(`/api/pedidos/${pedidoId}`)
        if (pedidoResponse.error) {
          throw new Error(pedidoResponse.error || 'Erro ao carregar detalhes do pedido')
        }
        setPedido(pedidoResponse.data)

        // Buscar impostos
        const impostosResponse = await api.get(`/api/pedidos/${pedidoId}/impostos`)
        setImpostos(Array.isArray(impostosResponse) ? impostosResponse : [])

        // Buscar produtos do pedido
        const produtosPedidoResponse = await api.get(`/api/pedidos/${pedidoId}/produtos`)
        const produtosPedido = Array.isArray(produtosPedidoResponse) ? produtosPedidoResponse : []

        const produtosFormatados = await Promise.all(
          produtosPedido.map(async (item: any) => {
            try {
              if (!item || !item.produto || !item.produto.id) {
                return null
              }

              const custoResponse = await api.get(`/api/produtos/${item.produto.id}/custo-com-margem`)
              const custoTotal = custoResponse.custo_com_margem || item.produto.preco_unitario || 0

              return {
                id: item.produto.id,
                nome: item.produto.nome,
                custoTotal: custoTotal,
                quantidade: item.quantidade
              }
            } catch (error) {
              console.error('Erro ao processar produto:', error)
              if (!item || !item.produto) return null

              return {
                id: item.produto.id,
                nome: item.produto.nome,
                custoTotal: item.produto.preco_unitario || 0,
                quantidade: item.quantidade
              }
            }
          })
        )

        const produtosValidos = produtosFormatados.filter(produto => produto !== null)
        setProdutosSelecionados(produtosValidos)

      } catch (err) {
        console.error('Erro ao buscar dados:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    fetchDados()
  }, [pedidoId])

  // Cálculos do orçamento
  const valorTotalProdutos = produtosSelecionados.reduce((total, produto) => {
    return total + (produto.custoTotal * produto.quantidade)
  }, 0)

  // O valor dos produtos já inclui a margem aplicada individualmente
  const valorComMargem = valorTotalProdutos

  let valorComImpostos = valorComMargem
  const detalhesImpostos: Array<{
    tipo: string
    percentual: number
    valorAnterior: number
    valorImposto: number
    valorFinal: number
  }> = []

  impostos.forEach(imposto => {
    const impostoDecimal = imposto.percentual / 100
    const valorAnterior = valorComImpostos
    const valorImposto = valorAnterior * impostoDecimal / (1 - impostoDecimal)
    valorComImpostos = valorAnterior + valorImposto

    detalhesImpostos.push({
      tipo: imposto.tipo_imposto,
      percentual: imposto.percentual,
      valorAnterior,
      valorImposto,
      valorFinal: valorComImpostos
    })
  })

  const valorFrete = pedido?.valor_frete || 0
  const valorFinal = valorComImpostos + valorFrete

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = async () => {
    try {
      // Mostrar indicador de carregamento
      const button = document.querySelector('.export-pdf-btn') as HTMLButtonElement
      if (button) {
        button.disabled = true
        button.textContent = 'Abrindo impressão...'
      }

      // Usar método de impressão diretamente (mais confiável)
      const exportViaPrint = () => {
        const element = document.querySelector('.orcamento-content') as HTMLElement
        if (!element) {
          alert('Erro: Conteúdo do orçamento não encontrado')
          return
        }

        // Criar uma nova janela com o conteúdo do orçamento
        const printWindow = window.open('', '_blank', 'width=800,height=600')
        if (!printWindow) {
          alert('Popup bloqueado. Permita popups para exportar PDF.\n\nAlternativamente, use o botão "Imprimir" desta página.')
          return
        }

        // HTML otimizado para impressão/PDF
        const printHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Orçamento - Pedido ${pedido.id.slice(-8)}</title>
            <style>
              @page {
                margin: 15mm;
                size: A4;
              }
              
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              
              body {
                font-family: 'Arial', sans-serif;
                font-size: 11pt;
                line-height: 1.4;
                color: #000;
                background: #fff;
                padding: 0;
                margin: 0;
              }
              
              h1 { font-size: 24pt; margin-bottom: 10px; text-align: center; }
              h2 { font-size: 16pt; margin-bottom: 8px; }
              h3 { font-size: 14pt; margin-bottom: 6px; }
              h4 { font-size: 12pt; margin-bottom: 4px; }
              
              p { margin-bottom: 4px; }
              
              /* Logo da empresa */
              .logo-container {
                width: 220px;
                height: 60px;
                background-color: #000;
                border-radius: 4px;
                display: flex;
                align-items: center;
                padding: 0 12px;
                margin-bottom: 20px;
              }
              
              .logo-text {
                color: #facc15;
                font-weight: bold;
                font-size: 18pt;
                font-family: serif;
              }
              
              .logo-brand {
                color: #facc15;
                font-size: 14pt;
                margin-left: 8px;
              }

              /* Cabeçalho do orçamento */
              .orcamento-header {
                page-break-inside: avoid;
              }

              /* Grid layout */
              .grid {
                display: grid;
              }
              
              .grid-cols-2 {
                grid-template-columns: 1fr 1fr;
              }
              
              .grid-cols-3 {
                grid-template-columns: 1fr 1fr 1fr;
              }
              
              .gap-4 {
                gap: 1rem;
              }
              
              .gap-8 {
                gap: 2rem;
              }

              /* Flexbox */
              .flex {
                display: flex;
              }
              
              .flex-1 {
                flex: 1;
              }
              
              .items-center {
                align-items: center;
              }
              
              .justify-center {
                justify-content: center;
              }

              /* Bordas */
              .border {
                border: 1px solid #9ca3af;
              }
              
              .border-2 {
                border: 2px solid #9ca3af;
              }
              
              .border-r-2 {
                border-right: 2px solid #9ca3af;
              }
              
              .border-t {
                border-top: 1px solid #9ca3af;
              }
              
              .border-t-0 {
                border-top: none;
              }

              /* Larguras e alturas */
              .w-12 { width: 3rem; }
              .w-20 { width: 5rem; }
              .w-24 { width: 6rem; }
              .w-32 { width: 8rem; }

              .h-16 { height: 4rem; }
              .h-24 { width: 6rem; }
              .min-h-24 { min-height: 6rem; }

              /* Espaçamentos */
              .p-2 { padding: 0.5rem; }
              .p-3 { padding: 0.75rem; }
              .pt-2 { padding-top: 0.5rem; }
              .mb-1 { margin-bottom: 0.25rem; }
              .mb-2 { margin-bottom: 0.5rem; }
              .mb-3 { margin-bottom: 0.75rem; }
              .mb-4 { margin-bottom: 1rem; }
              .mt-4 { margin-top: 1rem; }
              .mt-8 { margin-top: 2rem; }
              .mt-16 { margin-top: 4rem; }

              /* Tipografia */
              .text-xs { font-size: 8pt; }
              .text-sm { font-size: 9pt; }
              .text-lg { font-size: 12pt; }
              .font-bold { font-weight: bold; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }

              /* Espaçamento entre elementos */
              .space-y-1 > * + * { margin-top: 0.25rem; }
              .space-y-2 > * + * { margin-top: 0.5rem; }

              /* Cores de fundo */
              .bg-gray-50 { background-color: #f9fafb; }
              .bg-gray-100 { background-color: #f3f4f6; }
              .bg-gray-200 { background-color: #e5e7eb; }
              .bg-black { background-color: black; }

              /* Cores de texto */
              .text-gray-400 { color: #9ca3af; }
              .text-gray-600 { color: #4b5563; }
              .text-gray-700 { color: #374151; }
              .text-gray-900 { color: #111827; }
              .text-yellow-400 { color: #facc15; }

              /* Quebra de linha */
              .whitespace-pre-wrap { white-space: pre-wrap; }
              
              /* Seções */
              .section {
                margin-bottom: 20px;
                page-break-inside: avoid;
              }
              
              .section-header {
                background-color: #f3f4f6;
                padding: 12px;
                border: 1px solid #9ca3af;
                font-weight: bold;
              }
              
              .section-content {
                padding: 12px;
                border: 1px solid #9ca3af;
                border-top: none;
              }
              
              /* Grid para informações */
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 15px;
              }
              
              .info-item {
                margin-bottom: 8px;
              }
              
              .info-label {
                font-weight: bold;
                color: #374151;
              }
              
              .info-value {
                color: #111827;
              }
              
              /* Tabelas */
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
              }
              
              th, td {
                border: 1px solid #d1d5db;
                padding: 8px;
                text-align: left;
              }
              
              th {
                background-color: #f3f4f6;
                font-weight: bold;
                font-size: 10pt;
                text-transform: uppercase;
              }
              
              td {
                font-size: 10pt;
              }
              
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              
              /* Resumo financeiro */
              .financial-summary {
                background-color: #f9fafb;
                padding: 15px;
                border: 1px solid #d1d5db;
              }
              
              .summary-line {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              
              .summary-total {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-top: 2px solid #374151;
                font-weight: bold;
                font-size: 12pt;
                background-color: #fef3c7;
                padding-left: 8px;
                padding-right: 8px;
                margin-top: 8px;
              }
              
              /* Quebras de página */
              .page-break { page-break-before: always; }
              .no-break { page-break-inside: avoid; }
              
              /* Rodapé */
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 9pt;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 10px;
              }
            </style>
          </head>
          <body>
            ${element.innerHTML}
            <div class="footer">
              <p>Orçamento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
              <p>Este orçamento é válido por 30 dias a partir da data de emissão.</p>
            </div>
          </body>
          </html>
        `

        printWindow.document.write(printHTML)
        printWindow.document.close()

        // Aguardar carregamento e mostrar instruções
        printWindow.onload = () => {
          setTimeout(() => {
            // Abrir automaticamente a janela de impressão
            printWindow.print()

            // Mostrar instruções após um delay
            setTimeout(() => {
              alert('Para salvar como PDF:\n\n1. Na janela de impressão que abriu\n2. Escolha "Salvar como PDF" como destino\n3. Clique em "Salvar"\n\nSe a janela não abriu, verifique se popups estão permitidos.')
            }, 500)
          }, 1000)
        }
      }

      // Usar método de impressão diretamente
      exportViaPrint()

    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('Erro ao abrir janela de impressão. Use o botão "Imprimir" desta página e selecione "Salvar como PDF".')
    } finally {
      // Restaurar botão
      setTimeout(() => {
        const button = document.querySelector('.export-pdf-btn') as HTMLButtonElement
        if (button) {
          button.disabled = false
          button.textContent = 'Salvar como PDF'
        }
      }, 2000)
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
          <h2 className="text-red-800 dark:text-red-200 font-medium">Erro</h2>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          <div className="mt-3 space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
            >
              Tentar novamente
            </button>
            <Link
              href={`/pedidos/${pedidoId}`}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Voltar para o pedido
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cabeçalho com ações - não aparece na impressão */}
      <div className="print:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <Link href="/pedidos" className="text-gray-400 hover:text-gray-500">
                      Pedidos
                    </Link>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                      </svg>
                      <Link href={`/pedidos/${pedidoId}`} className="ml-4 text-gray-400 hover:text-gray-500">
                        Pedido #{pedido.id.slice(-8)}
                      </Link>
                    </div>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                      </svg>
                      <span className="ml-4 text-sm font-medium text-gray-900 dark:text-white">
                        Exportar Orçamento
                      </span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
              <button
                onClick={handleExportPDF}
                className="export-pdf-btn inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Salvar como PDF
              </button>
              <Link
                href={`/pedidos/${pedidoId}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Voltar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo do orçamento */}
      <div className="orcamento-content max-w-4xl mx-auto p-8 bg-white dark:bg-gray-800 print:shadow-none print:max-w-none print:p-0">

        {/* Cabeçalho principal - Dados da empresa centralizados */}
        <div className="orcamento-header border-2 border-gray-400 mb-4 print:mb-3">
          <div className="p-4">
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900 print:text-black mb-2">BV BoaVentura</h1>
              <div className="text-xs text-gray-700 print:text-black space-y-1">
                <p><strong>CNPJ:</strong> 33.330.323/0001-00 | <strong>IE:</strong> Não informado</p>
                <p>Rua Antonio Stupello, 676 - São Joaquim da Barra</p>
                <p>Centro - São Paulo - SP</p>
                <p><strong>Contato:</strong> (16) 3818-3873</p>
                <p><strong>Email:</strong> contato@bvcaldeiraria.com.br</p>
                <p>@bvcaldeiraria</p>
              </div>
            </div>
          </div>
        </div>

        {/* Linha de informações do orçamento */}
        <div className="grid grid-cols-3 gap-4 mb-4 print:mb-3">
          <div className="border border-gray-400 p-2 text-center">
            <div className="text-xs text-gray-600 print:text-black">Orçamento nº:</div>
            <div className="font-bold text-sm text-gray-900 print:text-black">#{pedido?.id.slice(-8)}</div>
          </div>
          <div className="border border-gray-400 p-2 text-center">
            <div className="text-xs text-gray-600 print:text-black">Emitido em:</div>
            <div className="font-bold text-sm text-gray-900 print:text-black">{new Date().toLocaleDateString('pt-BR')}</div>
          </div>
          <div className="border border-gray-400 p-2 text-center">
            <div className="text-xs text-gray-600 print:text-black">Válido até:</div>
            <div className="font-bold text-sm text-gray-900 print:text-black">
              {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Dados do Cliente */}
        {pedido?.cliente && (
          <div className="mb-4 print:mb-3">
            <div className="bg-gray-200 print:bg-gray-200 border border-gray-400 p-2 text-center">
              <h2 className="font-bold text-sm text-gray-900 print:text-black">DADOS DO CLIENTE</h2>
            </div>
            <table className="w-full border-collapse border border-gray-400 text-xs">
              <tbody>
                <tr>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100 w-20">CLIENTE</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black">{pedido.cliente.nome_cliente_empresa}</td>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100 w-20">TELEFONE</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black">{pedido.cliente.telefone_whatsapp}</td>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100 w-20">EMAIL</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black">{pedido.cliente.email || 'Não informado'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100">CNPJ/CPF</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black">{pedido.cliente.cnpj_cpf || 'Não informado'}</td>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100">RG</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black">Não informado</td>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100" colSpan={2}></td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100">ENDEREÇO</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black" colSpan={2}>
                    {pedido.cliente.endereco || 'Não informado'}
                  </td>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100">BAIRRO</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black" colSpan={2}>
                    {pedido.cliente.bairro || 'Não informado'}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100">CIDADE</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black">{pedido.cliente.cidade}</td>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100">ESTADO</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black">{pedido.cliente.estado_uf}</td>
                  <td className="border border-gray-400 p-2 font-bold bg-gray-100 print:bg-gray-100">CEP</td>
                  <td className="border border-gray-400 p-2 text-gray-900 print:text-black">{pedido.cliente.cep || 'Não informado'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Tabela de Orçamento */}
        <div className="mb-4 print:mb-3">
          <div className="bg-gray-200 print:bg-gray-200 border border-gray-400 p-2 text-center">
            <h2 className="font-bold text-sm text-gray-900 print:text-black">ORÇAMENTO</h2>
          </div>
          <table className="w-full border-collapse border border-gray-400 text-xs">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-gray-400 p-2 font-bold text-gray-900 print:text-black w-12">ITEM</th>
                <th className="border border-gray-400 p-2 font-bold text-gray-900 print:text-black">PRODUTO/SERVIÇO</th>
                <th className="border border-gray-400 p-2 font-bold text-gray-900 print:text-black w-20">QUANT.</th>
                <th className="border border-gray-400 p-2 font-bold text-gray-900 print:text-black w-24">VALOR</th>
                <th className="border border-gray-400 p-2 font-bold text-gray-900 print:text-black w-24">SUB-TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {produtosSelecionados.length > 0 ? (
                produtosSelecionados.map((produto, index) => (
                  <tr key={produto.id}>
                    <td className="border border-gray-400 p-2 text-center text-gray-900 print:text-black">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="border border-gray-400 p-2 text-gray-900 print:text-black">
                      {produto.nome}
                    </td>
                    <td className="border border-gray-400 p-2 text-center text-gray-900 print:text-black">
                      {produto.quantidade}
                    </td>
                    <td className="border border-gray-400 p-2 text-right text-gray-900 print:text-black">
                      R$ {produto.custoTotal.toFixed(2)}
                    </td>
                    <td className="border border-gray-400 p-2 text-right text-gray-900 print:text-black font-bold">
                      R$ {(produto.custoTotal * produto.quantidade).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="border border-gray-400 p-8 text-center text-gray-500 print:text-gray-600">
                    Nenhum produto adicionado ao pedido
                  </td>
                </tr>
              )}


            </tbody>
          </table>
        </div>

        {/* Resumo Financeiro */}
        <div className="mb-4 print:mb-3">
          <div className="bg-gray-200 print:bg-gray-200 border border-gray-400 p-2 text-center">
            <h2 className="font-bold text-sm text-gray-900 print:text-black">RESUMO FINANCEIRO</h2>
          </div>
          <div className="border border-gray-400 border-t-0 p-4">
            <div className="space-y-3">
              {/* Sub-total */}
              <div className="flex justify-between items-center py-2 border-b border-gray-300">
                <span className="text-sm font-medium text-gray-900 print:text-black">
                  SUB-TOTAL GERAL:
                </span>
                <span className="text-sm font-bold text-gray-900 print:text-black">
                  R$ {valorTotalProdutos.toFixed(2)}
                </span>
              </div>

              {/* Impostos/Taxas */}
              {detalhesImpostos.map((detalhe, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-300">
                  <span className="text-sm text-gray-700 print:text-black">
                    {detalhe.tipo} ({detalhe.percentual.toFixed(2)}%):
                  </span>
                  <span className="text-sm font-medium text-gray-900 print:text-black">
                    R$ {detalhe.valorImposto.toFixed(2)}
                  </span>
                </div>
              ))}

              {/* Frete */}
              {valorFrete > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-gray-300">
                  <span className="text-sm text-gray-700 print:text-black">
                    Frete:
                  </span>
                  <span className="text-sm font-medium text-gray-900 print:text-black">
                    R$ {valorFrete.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Total Geral */}
              <div className="flex justify-between items-center pt-4 border-t-2 border-gray-400 bg-yellow-100 print:bg-yellow-200 px-3 py-3 rounded print:rounded-none">
                <span className="text-lg font-bold text-gray-900 print:text-black">
                  TOTAL GERAL:
                </span>
                <span className="text-lg font-bold text-gray-900 print:text-black">
                  R$ {valorFinal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Observações */}
        <div className="mb-6 print:mb-4">
          <div className="bg-gray-200 print:bg-gray-200 border border-gray-400 p-2 text-center">
            <h2 className="font-bold text-sm text-gray-900 print:text-black">OBSERVAÇÕES</h2>
          </div>
          <div className="border border-gray-400 border-t-0 p-3 min-h-24">
            <div className="text-xs text-gray-900 print:text-black space-y-2">
              {pedido?.observacoes && (
                <p className="whitespace-pre-wrap">{pedido.observacoes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé com assinatura do cliente */}
        <div className="flex justify-end mt-8 print:mt-6">
          <div className="text-center w-64">
            <div className="border-t border-gray-400 pt-2 mt-16">
              <div className="text-xs text-gray-900 print:text-black font-bold">
                {pedido?.cliente?.nome_responsavel || 'Cliente'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}