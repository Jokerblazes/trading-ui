import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import './styles.css';

function calculateMovingAverage(data, period) {
  const movingAverage = [];
  for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
          movingAverage.push({ time: Math.floor(convertToTimestamp(data[i].time_key) / 1000), value: null });
          continue;
      }
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
      movingAverage.push({ time: Math.floor(convertToTimestamp(data[i].time_key) / 1000), value: sum / period });
  }
  return movingAverage;
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
        time: Math.floor(convertToTimestamp(point.time_key) / 1000),
        value: isIndexUp ? proportion : -proportion,
    };
  });

  return breadthData;
}

function calculateNetHighLow(data) {
  const indexData = data.index;
  const constituentsData = data.constituents;
  const highLowData = calculate52WeekHighLow(constituentsData);

  const netHighLow = indexData.map((point) => {
    
      const date = point.time_key // 将时间标准化为日期字符串
      
      const dailyData = highLowData.get(date) || {};
    
      const highCount = dailyData.filter(stockPoint => {
        return stockPoint.isNewHigh
      }).length;

      const lowCount = dailyData.filter(stockPoint => {
        return stockPoint.isNewLow;
      }).length;

      return {
          time: Math.floor(convertToTimestamp(point.time_key) / 1000),
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
  const [selectedIndex, setSelectedIndex] = useState('HK.800000');

  useEffect(() => {

    const fetchChartData = async (index) => {
      try {
        setIsLoading(true);
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await fetch(`http://127.0.0.1:5000/api/index_kline?index=${index}&start_date=${startDate}&end_date=${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const indexKline = data.index;

        
        
          // 清除旧的图表
          const oldCharts = document.querySelectorAll('.tv-lightweight-charts');
          oldCharts.forEach(chart => chart.remove());

          const mainChart = createChart(document.getElementById('index-chart'), {
            width: document.getElementById('index-chart').clientWidth,
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

          const breadthChart = createChart(document.getElementById('breadth-chart'), { width: document.getElementById('breadth-chart').clientWidth,height: 100 });
          buildBreadthChart(data,breadthChart);
          const weekChart = createChart(document.getElementById('52week-chart'), { width: document.getElementById('52week-chart').clientWidth,height: 100 });
          build52WeekChart(data,weekChart);

          mainChart.applyOptions({
            timeScale: {
              timeVisible: false,
              tickMarkFormatter: (time, tickMarkType, locale) => {
                const date = new Date(time * 1000);
                // 使用 UTC+8 显示日期
                return date.toLocaleDateString(locale, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  timeZone: 'Asia/Shanghai' // 设置为中国标准时间
                });
              }
            }
          });
          breadthChart.applyOptions({
            timeScale: {
              timeVisible: false,
              tickMarkFormatter: (time, tickMarkType, locale) => {
                const date = new Date(time * 1000);
                // 使用 UTC+8 显示日期
                return date.toLocaleDateString(locale, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  timeZone: 'Asia/Shanghai' // 设置为中国标准时间
                });
              }
            }
          });
          weekChart.applyOptions({
            timeScale: {
              timeVisible: false,
              tickMarkFormatter: (time, tickMarkType, locale) => {
                const date = new Date(time * 1000);
                // 使用 UTC+8 显示日期
                return date.toLocaleDateString(locale, {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  timeZone: 'Asia/Shanghai' // 设置为中国标准时间
                });
              }
            }
          });
          const synchronizeCharts = (chart1, chart2) => {
            const onVisibleLogicalRangeChanged = () => {
                const logicalRange = chart1.timeScale().getVisibleLogicalRange();
                chart2.timeScale().setVisibleLogicalRange(logicalRange);
            };
      
            chart1.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);
            chart2.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChanged);
        };
      
        synchronizeCharts(mainChart, breadthChart);
        synchronizeCharts(mainChart, weekChart);
          // 清理函数
          return () => {
            mainChart.remove();
            breadthChart.remove();
          };
        
      } catch (error) {
        console.error('获取数据时出错:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData(selectedIndex);
  }, [selectedIndex]);

  const handleIndexChange = (event) => {
    setSelectedIndex(event.target.value);
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>错误: {error}</div>;
  }

  return (
    <div>
      <select id="index-selector" onChange={handleIndexChange} value={selectedIndex}>
        <option value="HK.800000">恒生指数</option>
        <option value="HK.800700">恒生科技指数</option>
      </select>
      <div ref={chartContainerRef}>
        <div id="index-chart"></div>
        <div id="breadth-chart"></div>
        <div id="52week-chart"></div>
      </div>
    </div>
  );
}

function buildMainChart(mainChart, indexKline) {
  buildIndex(mainChart, indexKline);
  buildMa(mainChart, indexKline);
  buildVolume(indexKline, mainChart);
}

function build52WeekChart(data,weekChart) {
  const netHighLowSeries = weekChart.addHistogramSeries();
  
  const netHighLow = calculateNetHighLow(data);
  netHighLowSeries.setData(netHighLow);
}

function buildVolume(indexKline, indexChart) {
  const formattedVolumeData = indexKline.map(item => ({
    time: Math.floor(convertToTimestamp(item.time_key) / 1000),
    value: item.turnover,
    color: item.close > item.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
  }));
  const volumeSeries = indexChart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: 'volume'
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

  const formattedCandlestickData = indexKline.map(item => {
    
    return (
      {
      time: Math.floor(convertToTimestamp(item.time_key) / 1000), // 确保转换为秒
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close
    })
  });

  const mainSeries = indexChart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    priceScaleId: 'index',
  });
  mainSeries.setData(formattedCandlestickData);

  // 订阅鼠标移动事件
  indexChart.subscribeCrosshairMove((param) => {
    const tooltip = document.getElementById('tooltip');
    if (!param || !param.time || !param.point) {
      tooltip.style.display = 'none';
      return;
    }
  
    const price = param.seriesData.get(mainSeries);
    if (price) {
      const { open, high, low, close } = price;
      tooltip.innerHTML = `
        <div>开盘价: ${open}</div>
        <div>最高价: ${high}</div>
        <div>最低价: ${low}</div>
        <div>收盘价: ${close}</div>
      `;
      tooltip.style.display = 'block';
  
      // 确保工具提示不与鼠标重叠
      const offsetX = 10;
      const offsetY = 10;
      tooltip.style.left = (param.point.x + offsetX) + 'px';
      tooltip.style.top = (param.point.y + offsetY) + 'px';
    }
  });
}

function convertToTimestamp(time_key) {
  const date = new Date(time_key);
  const utc8Time = date.getTime() + 8 * 60 * 60 * 1000; // 加上8小时的偏移
  return utc8Time;
}

function buildMa(indexChart, indexKline) {
  const ma5Series = indexChart.addLineSeries({
    color: '#FF0000', // 红色
    lineWidth: 2,
    title: 'MA5',
    priceScaleId: 'ma5',
  });

  const ma10Series = indexChart.addLineSeries({
    color: '#00FF00', // 绿色
    lineWidth: 2,
    title: 'MA10',
  });

  const ma20Series = indexChart.addLineSeries({
    color: '#0000FF', // 蓝色
    lineWidth: 2,
    title: 'MA20',
    priceScaleId: 'ma20',
  });

  const ma50Series = indexChart.addLineSeries({
    color: '#FFA500', // 橙色
    lineWidth: 2,
    title: 'MA50',
    priceScaleId: 'ma50',
  });

  const ma200Series = indexChart.addLineSeries({
    color: '#800080', // 紫色
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


function calculate52WeekHighLow(stockData) {
  const period = 52 * 5; // 假设每周5个交易日
  const highLowData = new Map();

  for (const [symbol, dailyData] of Object.entries(stockData)) {
      const dateMap = new Map();
      
      // 将 dailyData 转换为 Map，以日期为键
      for (const entry of Object.values(dailyData)) {
          dateMap.set(entry.time_key, entry);
      }

      const dates = Array.from(dateMap.keys()).sort(); // 获取并排序日期

      for (let i = 0; i < dates.length; i++) {
          const date = dates[i];
          const start = Math.max(0, i - period + 1);
          const end = i + 1;
          const periodDates = dates.slice(start, end);
          const periodData = periodDates.map(d => dateMap.get(d));
          const high52Week = Math.max(...periodData.map(d => d.high));
          const low52Week = Math.min(...periodData.map(d => d.low));

          if (!highLowData.has(date)) {
              highLowData.set(date, []);
          }

          highLowData.get(date).push({
              symbol,
              ...dateMap.get(date),
              high52Week,
              low52Week,
              isNewHigh: dateMap.get(date).high == high52Week ,
              isNewLow: dateMap.get(date).low == low52Week ,
          });
      }
  }
  return highLowData;
}


