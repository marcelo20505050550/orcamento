'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useReactToPrint } from 'react-to-print'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import api, { fetchApi } from '@/lib/api'

type OrcamentoExportacao = {
  informacoes_gerais: {
    codigo_orcamento: string
    data_geracao: string
    data_validade: string
    valido_por_dias: number
  }
  cliente: {
    id: string
    email: string
    nome: string
  }
  produto: {
    id: string
    nome: string
    descricao: string
    quantidade: number
    preco_unitario: number
  }
  pedido: {
    id: string
    status: string
    observacoes: string
    tem_frete: boolean
    valor_frete: number
    margem_lucro_percentual: number
    impostos_percentual: number
  }
  detalhamento: {
    materiais: Array<{
      nome: string
      quantidade: number
      preco_unitario: number
      subtotal: number
    }>
    processos: Array<{
      nome: string
      quantidade: number
      preco_por_unidade: number
      subtotal: number
    }>
    mao_de_obra: Array<{
      tipo: string
      horas: number
      preco_por_hora: number
      subtotal: number
    }>
    itens_extras: Array<{
      nome: string
      descricao: string
      valor: number
    }>
  }
  resumo: {
    custo_total_materiais: number
    custo_total_processos: number
    custo_total_mao_de_obra: number
    custo_total_itens_extras: number
    valor_frete: number
    subtotal: number
    margem_lucro_percentual: number
    valor_margem_lucro: number
    total_com_margem: number
    impostos_percentual: number
    valor_impostos: number
    custo_total: number
  }
  observacoes: string[]
}

// Funções auxiliares movidas para fora do componente para evitar recriações
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatDate = (dateString: string) => {
  if (!dateString) {
    return 'Data não disponível'
  }
  
  // Se a string já está no formato DD/MM/YYYY, retorna como está
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString
  }
  
  const date = new Date(dateString)
  
  // Verifica se a data é válida
  if (isNaN(date.getTime())) {
    return 'Data inválida'
  }
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

function ExportarOrcamentoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pedidoId = searchParams.get('pedido')
  
  const [orcamento, setOrcamento] = useState<OrcamentoExportacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const orcamentoRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Evita execução se não há pedidoId
      if (!pedidoId) {
        setError('ID do pedido não fornecido')
        setLoading(false)
        return
      }
      
    // Evita execução se já tem dados carregados
    if (orcamento && !loading) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await api.get('/api/orcamentos/exportar', {
          params: { pedido_id: pedidoId }
        })
        
        setOrcamento(response.data)
      } catch (err) {
        console.error('Erro ao buscar orçamento:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar orçamento')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [pedidoId]) // Apenas pedidoId como dependência

  const handlePrint = useReactToPrint({
    contentRef: orcamentoRef,
    documentTitle: `Orcamento-${orcamento?.informacoes_gerais.codigo_orcamento || 'Exportado'}`,
  })

  const handleExportPDFWithHtml2Canvas = async () => {
    if (!orcamentoRef.current || !orcamento) return

    // Adiciona estilos CSS para forçar cores compatíveis
    const style = document.createElement('style')
    style.innerHTML = `
      .pdf-export * {
        color: #000000 !important;
        background-color: #ffffff !important;
        border-color: #e5e7eb !important;
      }
      .pdf-export .bg-gray-50 {
        background-color: #f9fafb !important;
      }
      .pdf-export .bg-gray-100 {
        background-color: #f3f4f6 !important;
      }
      .pdf-export .text-gray-600 {
        color: #4b5563 !important;
      }
      .pdf-export .text-gray-900 {
        color: #111827 !important;
      }
      .pdf-export .border-gray-200 {
        border-color: #e5e7eb !important;
      }
    `
    document.head.appendChild(style)
    
    // Adiciona classe temporária para aplicar estilos
    orcamentoRef.current.classList.add('pdf-export')
    
    // Captura o elemento HTML como canvas
    const canvas = await html2canvas(orcamentoRef.current, {
      scale: 2, // Aumenta a qualidade
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })

    // Remove a classe e estilos temporários
    orcamentoRef.current.classList.remove('pdf-export')
    document.head.removeChild(style)

    // Calcula as dimensões do PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
    const imgX = (pdfWidth - imgWidth * ratio) / 2
    const imgY = 0

    // Adiciona a imagem ao PDF
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
    
    // Baixa o arquivo PDF
    const fileName = `Orcamento-${orcamento.informacoes_gerais.codigo_orcamento}.pdf`
    pdf.save(fileName)
  }

  const handleExportPDFWithPuppeteer = async () => {
    if (!orcamento) return

    const response = await fetchApi('/api/orcamentos/exportar-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pedidoId: orcamento.pedido.id
      })
    })

    if (!response.ok) {
      throw new Error('Falha ao gerar PDF com Puppeteer')
    }

    // Baixa o PDF
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Orcamento-${orcamento.informacoes_gerais.codigo_orcamento}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
          <h2 className="text-red-800 dark:text-red-200 font-medium">Erro</h2>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          <button 
            onClick={() => router.push('/orcamentos')}
            className="mt-3 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Voltar aos Orçamentos
          </button>
        </div>
      </div>
    )
  }

  if (!orcamento) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md">
          <h2 className="text-yellow-800 dark:text-yellow-200 font-medium">Orçamento não encontrado</h2>
          <p className="text-yellow-700 dark:text-yellow-300 mt-1">
            O orçamento solicitado não foi encontrado ou você não tem permissão para acessá-lo.
          </p>
          <button 
            onClick={() => router.push('/orcamentos')}
            className="mt-3 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Voltar aos Orçamentos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Exportar Orçamento
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Orçamento #{orcamento.informacoes_gerais.codigo_orcamento} para impressão ou envio ao cliente
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/pedidos/${orcamento.pedido.id}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar ao Pedido
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg 
              className="mr-2 h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            Imprimir
          </button>
          <button
            onClick={handleExportPDFWithHtml2Canvas}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg 
              className="mr-2 h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Documento de Orçamento para Impressão */}
      <div 
        ref={orcamentoRef}
        className="bg-white shadow-lg rounded-lg overflow-hidden max-w-4xl mx-auto my-8 print:shadow-none print:rounded-none print:my-0 print:max-w-full"
      >
        {/* Cabeçalho */}
        <div className="border-b border-gray-200 p-8 flex justify-between items-start">
          <div>
            {/* Logo da Empresa */}
            <div className="mb-4">
              <img 
                src="/images/bv-logo.png" 
                alt="BV BoaVentura Logo" 
                className="h-16 w-auto"
              />
            </div>
            
            {/* Informações do Orçamento */}
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
              Código: <span className="font-semibold">{orcamento.informacoes_gerais.codigo_orcamento}</span>
            </p>
            <p className="text-sm text-gray-600">
              Data: <span className="font-semibold">{formatDate(orcamento.informacoes_gerais.data_geracao)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Válido até: <span className="font-semibold">{formatDate(orcamento.informacoes_gerais.data_validade)}</span>
            </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900">PROPOSTA COMERCIAL</h2>
            <p className="text-sm text-gray-600 mt-1">Depto de Vendas / Orçamentos - José Luiz Boaventura</p>
            <p className="text-sm text-gray-600">Nossas redes sociais: @bvcaldeiraria</p>
            <p className="text-sm text-gray-600 mt-2">Rua Antonio Stupello, 676</p>
            <p className="text-sm text-gray-600">Telefone: (16) 99162-4446</p>
            <p className="text-sm text-gray-600">E-mail: jlboaventura@outlook.com</p>
            <p className="text-sm text-gray-600">CNPJ: 33.330.323.001-00</p>
          </div>
        </div>

        {/* Informações do Cliente */}
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações do Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nome</p>
              <p className="text-base font-medium text-gray-900">{orcamento.cliente.nome}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-base font-medium text-gray-900">{orcamento.cliente.email}</p>
            </div>
          </div>
        </div>

        {/* Informações do Produto */}
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Produto</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nome do Produto</p>
                <p className="text-base font-medium text-gray-900">{orcamento.produto.nome}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Quantidade</p>
                <p className="text-base font-medium text-gray-900">{orcamento.produto.quantidade} unidades</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">Descrição</p>
              <p className="text-base text-gray-900">{orcamento.produto.descricao}</p>
            </div>
          </div>
        </div>

        {/* Detalhamento de Materiais */}
        {orcamento.detalhamento.materiais.length > 0 && (
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Materiais</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço Unitário
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orcamento.detalhamento.materiais.map((material, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {material.nome}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {material.quantidade}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {formatCurrency(material.preco_unitario)}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(material.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <th colSpan={3} scope="row" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      Total de Materiais
                    </th>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(orcamento.resumo.custo_total_materiais)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Detalhamento de Processos */}
        {orcamento.detalhamento.processos.length > 0 && (
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Processos de Fabricação</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processo
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço Unitário
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orcamento.detalhamento.processos.map((processo, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {processo.nome}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {processo.quantidade}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {formatCurrency(processo.preco_por_unidade)}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(processo.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <th colSpan={3} scope="row" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      Total de Processos
                    </th>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(orcamento.resumo.custo_total_processos)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Detalhamento de Mão de Obra */}
        {orcamento.detalhamento.mao_de_obra.length > 0 && (
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Mão de Obra</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horas
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço por Hora
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orcamento.detalhamento.mao_de_obra.map((mo, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {mo.tipo}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {mo.horas.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {formatCurrency(mo.preco_por_hora)}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(mo.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <th colSpan={3} scope="row" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      Total de Mão de Obra
                    </th>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(orcamento.resumo.custo_total_mao_de_obra)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Detalhamento de Itens Extras */}
        {orcamento.detalhamento.itens_extras.length > 0 && (
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Itens Extras</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orcamento.detalhamento.itens_extras.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {item.nome}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.descricao}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {formatCurrency(item.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <th colSpan={2} scope="row" className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      Total de Itens Extras
                    </th>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(orcamento.resumo.custo_total_itens_extras)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Resumo */}
        <div className="p-8 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Orçamento</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-base font-medium text-gray-900 mb-3">Custos Base</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Materiais:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(orcamento.resumo.custo_total_materiais)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Processos:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(orcamento.resumo.custo_total_processos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mão de Obra:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(orcamento.resumo.custo_total_mao_de_obra)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Itens Extras:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(orcamento.resumo.custo_total_itens_extras)}</span>
                </div>
              {orcamento.resumo.valor_frete > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Frete:</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(orcamento.resumo.valor_frete)}</span>
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-gray-300 flex justify-between">
                <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(orcamento.resumo.subtotal)}</span>
              </div>
              
              {orcamento.resumo.margem_lucro_percentual > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Margem de Lucro ({orcamento.resumo.margem_lucro_percentual}%):</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(orcamento.resumo.valor_margem_lucro)}</span>
                </div>
              )}
              
              {orcamento.resumo.margem_lucro_percentual > 0 && (
                <div className="pt-1 flex justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total com Margem:</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(orcamento.resumo.total_com_margem)}</span>
            </div>
              )}
              
              {orcamento.resumo.impostos_percentual > 0 && (
              <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Impostos ({orcamento.resumo.impostos_percentual}%):</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(orcamento.resumo.valor_impostos)}</span>
              </div>
              )}
              
              <div className="pt-2 mt-2 border-t-2 border-gray-400 flex justify-between">
                <span className="text-lg font-bold text-gray-900">TOTAL FINAL:</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(orcamento.resumo.custo_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Observações */}
        {orcamento.observacoes.length > 0 && (
          <div className="p-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações</h2>
            <ul className="list-disc pl-5 space-y-2">
              {orcamento.observacoes.map((obs, index) => (
                <li key={index} className="text-sm text-gray-600">
                  {obs}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rodapé */}
        <div className="p-8 text-center">
          <p className="text-sm text-gray-600">
            Este orçamento é válido por {orcamento.informacoes_gerais.valido_por_dias} dias a partir da data de emissão.
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Para mais informações ou dúvidas, entre em contato pelo email contato@sistemaorcamentos.com.br
          </p>
          <p className="text-xs text-gray-500 mt-6">
            © {new Date().getFullYear()} Sistema de Orçamentos - Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ExportarOrcamentoPage() {
  return (
    <Suspense fallback={
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ExportarOrcamentoContent />
    </Suspense>
  )
} 