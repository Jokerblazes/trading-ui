import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';


function calculateMovingAverage(data, period) {
  const movingAverage = [];
  for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
          movingAverage.push({ time: data[i].time_key, value: null });
          continue;
      }
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
      movingAverage.push({ time: data[i].time_key, value: sum / period });
  }
  return movingAverage;
}



// 辅助函数：计算移动平均线
function calculateMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: null });
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}



function calculate50DayBreadth(data) {
  const indexData = data.index;
  const constituentsData = data.constituents;
  
  const breadthData = indexData.map((point, index) => {
      const previousClose = index > 0 ? indexData[index - 1].close : point.close;
      const isIndexUp = point.close > previousClose;

      const count = Object.values(constituentsData).filter(stockData => stockData[index] != undefined).filter(stockData => {
          const stockPoint = stockData[index];
          const ma = calculateMovingAverage(stockData, 50)[index];
          
          const ma50 = ma.value;
          return isIndexUp ? stockPoint.close > ma50 : stockPoint.close < ma50;
      }).length;

      const proportion = count / Object.keys(constituentsData).length;
      return {
        time: point.time_key,
        value: isIndexUp ? proportion : -proportion,
    };
  });

  return breadthData;
}

function calculateNetHighLow(data) {
  const indexData = data.index;
  const constituentsData = data.constituents;

  const netHighLow = indexData.map((point, index) => {
      const highCount = Object.values(constituentsData).filter(stockData => stockData[index].high > stockData[index].low).length;
      const lowCount = Object.values(constituentsData).filter(stockData => stockData[index].low > stockData[index].high).length;
      return {
          time: point.time_key,
          value: highCount - lowCount,
      };
  });

  return netHighLow;
}
function buildBreadthChart(data,chart) {
  
  const breadthSeries = chart.addLineSeries();
  const breath = calculate50DayBreadth(data)          
  breadthSeries.setData(breath);
}

export function App() {
  const chartContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ... existing code ...
        setIsLoading(true);
        const index = 'HK.800000';
        const startDate = '2024-01-27';
        const endDate = '2024-10-27';
        const response = await fetch(`http://127.0.0.1:5000/api/index_kline?index=${index}&start_date=${startDate}&end_date=${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // 处理返回的数据
        const constituentsKline = data.constituents; // 所有成份股的历史K线数据
        
        
        const indexKline = data.index;

        if (chartContainerRef.current && indexKline.length > 0) {
          const mainChart = createChart(document.getElementById('index-chart'), {
            width: chartContainerRef.current.clientWidth,
            height: 400,
            layout: {
              background: { type: ColorType.Solid, color: 'white' },
              textColor: 'black',
            },
            grid: {
              vertLines: { color: 'rgba(197, 203, 206, 0.5)' },
              horzLines: { color: 'rgba(197, 203, 206, 0.5)' },
            },
            rightPriceScale: {
              borderColor: 'rgba(197, 203, 206, 0.8)',
            },
            timeScale: {
              borderColor: 'rgba(197, 203, 206, 0.8)',
              timeVisible: true,
              secondsVisible: false,
            },
          });
      
          buildMainChart(mainChart, indexKline);
          mainChart.timeScale().fitContent();

          const breadthChart = createChart(document.getElementById('breadth-chart'), { width: chartContainerRef.current.clientWidth,height: 300 });
          buildBreadthChart(data,breadthChart);

          const synchronizeCharts = (chart1, chart2) => {
            const onVisibleLogicalRangeChanged = () => {
                const logicalRange = chart1.timeScale().getVisibleLogicalRange();
                chart2.timeScale().setVisibleLogicalRange(logicalRange);
            };
    
            chart1.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);
            chart2.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);
        };
    
        synchronizeCharts(mainChart, breadthChart);
          // 清理函数
          return () => {
            mainChart.remove();
            breadthChart.remove();
          };
        }
      } catch (error) {
        console.error('获取数据时出错:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  
  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>错误: {error}</div>;
  }

  return <div ref={chartContainerRef} /> ;
}
function buildMainChart(mainChart, indexKline) {
  buildIndex(mainChart, indexKline);
  buildMa(mainChart, indexKline);
  buildVolume(indexKline, mainChart);
}

function buildVolume(indexKline, indexChart) {
  const formattedVolumeData = indexKline.map(item => ({
    time: new Date(item.time_key).getTime() / 1000,
    value: item.turnover,
    color: item.close > item.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
  }));
  const volumeSeries = indexChart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: 'volume',
    scaleMargins: {
      top: 0.9,
      bottom: 0,
    },
  });

  // 设置成交量的独立价格尺度
  indexChart.priceScale('volume').applyOptions({
    scaleMargins: {
      top: 0.9,
      bottom: 0,
    },
  });
  volumeSeries.setData(formattedVolumeData);
}

function buildIndex(indexChart, indexKline) {
  const formattedCandlestickData = indexKline.map(item => ({
    time: new Date(item.time_key).getTime() / 1000,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close
  }));
  const mainSeries = indexChart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    priceScaleId: 'index',
  });
  mainSeries.setData(formattedCandlestickData);
}

function buildMa(indexChart, indexKline) {
  const ma5Series = indexChart.addLineSeries({
    color: '#2962FF',
    lineWidth: 2,
    title: 'MA5',
    priceScaleId: 'ma5',
  });

  const ma10Series = indexChart.addLineSeries({
    color: '#2962FF',
    lineWidth: 2,
    title: 'MA10',
  });

  const ma20Series = indexChart.addLineSeries({
    color: '#FF6D00',
    lineWidth: 2,
    title: 'MA20',
    priceScaleId: 'ma20',
  });

  const ma50Series = indexChart.addLineSeries({
    color: '#FF6D00',
    lineWidth: 2,
    title: 'MA50',
    priceScaleId: 'ma50',
  });

  const ma200Series = indexChart.addLineSeries({
    color: '#FF6D00',
    lineWidth: 2,
    title: 'MA200',
    priceScaleId: 'ma200',
  });
  // 计算移动平均线数据
  const ma5Data = calculateMovingAverage(indexKline, 5);
  const ma10Data = calculateMovingAverage(indexKline, 10);
  const ma20Data = calculateMovingAverage(indexKline, 20);
  const ma50Data = calculateMovingAverage(indexKline, 50);
  const ma200Data = calculateMovingAverage(indexKline, 200);
  ma5Series.setData(ma5Data);
  ma10Series.setData(ma10Data);
  ma20Series.setData(ma20Data);
  ma50Series.setData(ma50Data);
  ma200Series.setData(ma200Data);
}

