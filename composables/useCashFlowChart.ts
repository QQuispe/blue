import type { ChartData, ChartOptions } from 'chart.js'

export interface CashFlowChartData {
  months: string[]
  income: number[]
  expenses: number[]
}

export const useCashFlowChart = () => {
  const createChartData = (data: CashFlowChartData): ChartData<'bar'> => {
    const floatingData = data.income.map((inc) => [0, inc])
    const expenseFloating = data.expenses.map((exp) => [-exp, 0])

    return {
      labels: data.months,
      datasets: [
        {
          data: floatingData as any,
          backgroundColor: '#10b981',
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
        },
        {
          data: expenseFloating as any,
          backgroundColor: '#ef4444',
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
        },
      ],
    }
  }

  const createChartOptions = (totalIncome: number): ChartOptions<'bar'> => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (context: any) => {
              const value = Math.abs(context.raw[1] - context.raw[0])
              const formatted = value.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
              const label = context.datasetIndex === 0 ? 'Income' : 'Expenses'
              return `${label}: ${formatted}`
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: {
            display: false,
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 10,
            },
          },
        },
        y: {
          stacked: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.06)',
          },
          ticks: {
            color: '#6b7280',
            font: {
              size: 10,
            },
            callback: (value: number | string) => {
              const absValue = Math.abs(Number(value))
              if (absValue >= 1000) {
                return '$' + (absValue / 1000).toFixed(0) + 'k'
              }
              return '$' + absValue
            },
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
    }
  }

  return {
    createChartData,
    createChartOptions,
  }
}
