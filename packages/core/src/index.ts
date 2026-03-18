// =============================================
// FRETETRACKER - LÓGICA DE NEGÓCIO (CORE)
// Cálculos compartilhados entre Web e Mobile
// =============================================

import type { Frete, Abastecimento, Despesa, RotaCalculada, DadosImpressaoFrete } from '@fretetracker/types';

// =============================================
// CÁLCULOS DE FRETE
// =============================================

/**
 * Calcula o valor da comissão baseado no percentual
 */
export function calcularComissao(valorFrete: number, percentual: number): number {
  return Math.round((valorFrete * (percentual / 100)) * 100) / 100;
}

/**
 * Calcula o consumo estimado de combustível
 */
export function calcularConsumo(distanciaKm: number, consumoMedioPorLitro: number): number {
  if (consumoMedioPorLitro <= 0) return 0;
  return Math.round((distanciaKm / consumoMedioPorLitro) * 100) / 100;
}

/**
 * Calcula o custo estimado de combustível
 */
export function calcularCustoCombustivel(litros: number, precoPorLitro: number): number {
  return Math.round(litros * precoPorLitro * 100) / 100;
}

/**
 * Calcula o lucro líquido do frete
 */
export function calcularLucroLiquido(
  valorFrete: number,
  valorComissao: number,
  despesas: Despesa[],
  abastecimentos: Abastecimento[]
): number {
  const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);
  const totalAbastecimentos = abastecimentos.reduce((acc, a) => acc + (a.valor_total || 0), 0);
  
  return Math.round((valorComissao - totalDespesas - totalAbastecimentos) * 100) / 100;
}

/**
 * Formata duração em minutos para string legível
 */
export function formatarDuracao(minutos: number): string {
  if (minutos < 60) {
    return `${minutos} min`;
  }
  
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  
  if (mins === 0) {
    return `${horas}h`;
  }
  
  return `${horas}h ${mins}min`;
}

/**
 * Formata distância em km
 */
export function formatarDistancia(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Formata valor monetário em BRL
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata data para exibição
 */
export function formatarData(data: string | Date, formato: 'curta' | 'longa' | 'hora' = 'curta'): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  
  switch (formato) {
    case 'curta':
      return d.toLocaleDateString('pt-BR');
    case 'longa':
      return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'hora':
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    default:
      return d.toLocaleDateString('pt-BR');
  }
}

// =============================================
// CÁLCULO DE CONSUMO MÉDIO
// =============================================

/**
 * Calcula o consumo médio baseado no histórico de abastecimentos
 */
export function calcularConsumoMedioHistorico(abastecimentos: Abastecimento[]): number | null {
  if (abastecimentos.length < 2) return null;

  // Ordenar por km do odômetro
  const ordenados = [...abastecimentos]
    .filter(a => a.km_odometro !== undefined && a.km_odometro !== null)
    .sort((a, b) => (a.km_odometro || 0) - (b.km_odometro || 0));

  if (ordenados.length < 2) return null;

  let totalKm = 0;
  let totalLitros = 0;

  for (let i = 1; i < ordenados.length; i++) {
    const kmPercorrido = (ordenados[i].km_odometro || 0) - (ordenados[i - 1].km_odometro || 0);
    const litrosUsados = ordenados[i].litros;

    if (kmPercorrido > 0 && litrosUsados > 0) {
      totalKm += kmPercorrido;
      totalLitros += litrosUsados;
    }
  }

  if (totalLitros === 0) return null;

  return Math.round((totalKm / totalLitros) * 100) / 100;
}

// =============================================
// ESTATÍSTICAS
// =============================================

export interface EstatisticasFretes {
  total: number;
  pendentes: number;
  emTransito: number;
  entregues: number;
  cancelados: number;
  valorTotal: number;
  comissaoTotal: number;
}

export function calcularEstatisticasFretes(fretes: Frete[]): EstatisticasFretes {
  return fretes.reduce(
    (acc, frete) => {
      acc.total++;
      acc.valorTotal += frete.valor_frete;
      acc.comissaoTotal += frete.valor_comissao || 0;

      switch (frete.status) {
        case 'pendente':
          acc.pendentes++;
          break;
        case 'em_transito':
          acc.emTransito++;
          break;
        case 'entregue':
          acc.entregues++;
          break;
        case 'cancelado':
          acc.cancelados++;
          break;
      }

      return acc;
    },
    {
      total: 0,
      pendentes: 0,
      emTransito: 0,
      entregues: 0,
      cancelados: 0,
      valorTotal: 0,
      comissaoTotal: 0,
    }
  );
}

export interface EstatisticasDespesas {
  total: number;
  porTipo: Record<string, number>;
}

export function calcularEstatisticasDespesas(despesas: Despesa[]): EstatisticasDespesas {
  return despesas.reduce(
    (acc, despesa) => {
      acc.total += despesa.valor;
      acc.porTipo[despesa.tipo] = (acc.porTipo[despesa.tipo] || 0) + despesa.valor;
      return acc;
    },
    { total: 0, porTipo: {} as Record<string, number> }
  );
}

// =============================================
// GERAÇÃO DE DADOS PARA IMPRESSÃO
// =============================================

export function gerarDadosImpressao(
  frete: Frete,
  motoristaNome: string,
  placa: string
): DadosImpressaoFrete {
  const agora = new Date();
  
  return {
    numero_frete: frete.id.substring(0, 8).toUpperCase(),
    motorista: motoristaNome,
    placa: placa.toUpperCase(),
    origem: `${frete.origem.cidade}/${frete.origem.estado}`,
    destino: `${frete.destino.cidade}/${frete.destino.estado}`,
    distancia_km: frete.distancia_km || 0,
    valor_frete: frete.valor_frete,
    percentual_comissao: frete.percentual_comissao,
    valor_comissao: frete.valor_comissao || calcularComissao(frete.valor_frete, frete.percentual_comissao),
    data_saida: frete.data_saida || agora.toISOString(),
    data_impressao: agora.toISOString(),
  };
}

/**
 * Gera o texto formatado para impressão térmica 58mm
 * Cada linha tem no máximo 32 caracteres
 */
export function gerarTextoImpressao(dados: DadosImpressaoFrete): string {
  const linha = (texto: string) => texto.padEnd(32).substring(0, 32);
  const linhaCentralizada = (texto: string) => {
    const padding = Math.max(0, Math.floor((32 - texto.length) / 2));
    return ' '.repeat(padding) + texto;
  };
  const linhaValor = (label: string, valor: string) => {
    const espacos = 32 - label.length - valor.length;
    return label + '.'.repeat(Math.max(1, espacos)) + valor;
  };

  const dataFormatada = formatarData(dados.data_impressao, 'hora');
  const dataSaida = formatarData(dados.data_saida, 'hora');

  const linhas = [
    linhaCentralizada('================================'),
    linhaCentralizada('FRETETRACKER'),
    linhaCentralizada('Comprovante de Frete'),
    linhaCentralizada('================================'),
    '',
    linha(`Frete: #${dados.numero_frete}`),
    linha(`Data: ${dataFormatada}`),
    '',
    linhaCentralizada('--- MOTORISTA ---'),
    linha(dados.motorista.substring(0, 32)),
    linha(`Placa: ${dados.placa}`),
    '',
    linhaCentralizada('--- TRAJETO ---'),
    linha(`De: ${dados.origem}`),
    linha(`Para: ${dados.destino}`),
    linhaValor('Distancia', `${dados.distancia_km.toFixed(1)} km`),
    '',
    linhaCentralizada('--- VALORES ---'),
    linhaValor('Valor Frete', formatarMoeda(dados.valor_frete)),
    linhaValor('Comissao', `${dados.percentual_comissao}%`),
    linhaValor('Valor Comissao', formatarMoeda(dados.valor_comissao)),
    '',
    linhaCentralizada('================================'),
    linhaCentralizada('Saida prevista:'),
    linhaCentralizada(dataSaida),
    linhaCentralizada('================================'),
    '',
    '',
    '', // Espaço para corte
  ];

  return linhas.join('\n');
}

// =============================================
// VALIDAÇÕES
// =============================================

export interface ErroValidacao {
  campo: string;
  mensagem: string;
}

export function validarNovoFrete(dados: {
  origem_cidade?: string;
  origem_estado?: string;
  destino_cidade?: string;
  destino_estado?: string;
  valor_frete?: number;
}): ErroValidacao[] {
  const erros: ErroValidacao[] = [];

  if (!dados.origem_cidade?.trim()) {
    erros.push({ campo: 'origem_cidade', mensagem: 'Cidade de origem é obrigatória' });
  }

  if (!dados.origem_estado?.trim()) {
    erros.push({ campo: 'origem_estado', mensagem: 'Estado de origem é obrigatório' });
  }

  if (!dados.destino_cidade?.trim()) {
    erros.push({ campo: 'destino_cidade', mensagem: 'Cidade de destino é obrigatória' });
  }

  if (!dados.destino_estado?.trim()) {
    erros.push({ campo: 'destino_estado', mensagem: 'Estado de destino é obrigatório' });
  }

  if (!dados.valor_frete || dados.valor_frete <= 0) {
    erros.push({ campo: 'valor_frete', mensagem: 'Valor do frete deve ser maior que zero' });
  }

  return erros;
}

export function validarAbastecimento(dados: {
  litros?: number;
  valor_litro?: number;
}): ErroValidacao[] {
  const erros: ErroValidacao[] = [];

  if (!dados.litros || dados.litros <= 0) {
    erros.push({ campo: 'litros', mensagem: 'Quantidade de litros é obrigatória' });
  }

  if (dados.valor_litro !== undefined && dados.valor_litro < 0) {
    erros.push({ campo: 'valor_litro', mensagem: 'Valor por litro não pode ser negativo' });
  }

  return erros;
}

// =============================================
// LISTA DE ESTADOS BRASILEIROS
// =============================================

export const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
] as const;

export type EstadoBR = typeof ESTADOS_BR[number]['sigla'];

// =============================================
// EXPORT DEFAULT
// =============================================

export default {
  calcularComissao,
  calcularConsumo,
  calcularCustoCombustivel,
  calcularLucroLiquido,
  calcularConsumoMedioHistorico,
  calcularEstatisticasFretes,
  calcularEstatisticasDespesas,
  formatarDuracao,
  formatarDistancia,
  formatarMoeda,
  formatarData,
  gerarDadosImpressao,
  gerarTextoImpressao,
  validarNovoFrete,
  validarAbastecimento,
  ESTADOS_BR,
};
