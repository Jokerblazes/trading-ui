import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import './styles.css';
import _ from 'lodash';

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


function buildBreadthChart(chart) {
  const breadthSeries = chart.addLineSeries();         
  return breadthSeries;
}
 class IndexData {
  constructor(startDate,endDate, value) {
    this.startDate = startDate;
    this.endDate = endDate;
    this.value = value;
  }
}

export function App() {

  const chartContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState('HK.800000');
  const [chartData, setChartData] = useState([]);
  const chartDataRef = useRef(chartData);
  const mainChartRef = useRef(null); // 使用 useRef 来存储 mainChart
  const breadthChartRef = useRef(null);
  const mainSeriesRef = useRef(null);
  const ma5SeriesRef = useRef(null);
  const ma10SeriesRef = useRef(null);
  const ma20SeriesRef = useRef(null);
  const ma50SeriesRef = useRef(null);
  const ma200SeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const breadthSeriesRef = useRef(null);
  const weekSeriesRef = useRef(null);
  const weekChartRef = useRef(null);



  useEffect(() => {
    chartDataRef.current = chartData;

    if (chartData.length > 0) {
      const indexData = chartData.flatMap(item => item.value.index).sort((a, b) => {
        const timeA = Date.parse(a.time_key);
        const timeB = Date.parse(b.time_key);
        return timeA - timeB;
      });

      if (mainSeriesRef.current&&ma5SeriesRef.current&&ma10SeriesRef.current&&ma20SeriesRef.current&&ma50SeriesRef.current&&ma200SeriesRef.current) {
        const formattedData = cnvertToKLineData(indexData);

        mainSeriesRef.current.setData(formattedData);
        setVolumeSeries(indexData, volumeSeriesRef.current);
        const ma5Data = calculateMovingAverage(indexData, 5);

        ma5SeriesRef.current.setData(ma5Data);
        const ma10Data = calculateMovingAverage(indexData, 10);
        ma10SeriesRef.current.setData(ma10Data);
        const ma20Data = calculateMovingAverage(indexData, 20);
        ma20SeriesRef.current.setData(ma20Data);
        const ma50Data = calculateMovingAverage(indexData, 50);
        ma50SeriesRef.current.setData(ma50Data);
        const ma200Data = calculateMovingAverage(indexData, 200);
        ma200SeriesRef.current.setData(ma200Data);
        const constituentsData = chartData.flatMap(item => Object.entries(item.value.constituents))
          .reduce((acc, [key, valueArray]) => {
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key] = acc[key].concat(valueArray);
            return acc;
        }, {});
    

        for (const key in constituentsData) {
          constituentsData[key].sort((a, b) => {
            const timeA = Date.parse(a.time_key);
             const timeB = Date.parse(b.time_key);
            return timeA - timeB;
          });
        }

        const data = {index: indexData, constituents: constituentsData}
        const breadthData = calculate50DayBreadth(data);

        breadthSeriesRef.current.setData(breadthData);
        const weekData = calculateNetHighLow(data);
        weekSeriesRef.current.setData(weekData);
      
        function getCrosshairDataPoint(series, param) {
            if (!param.time) {
                return null;
            }
            const dataPoint = param.seriesData.get(series);
            return dataPoint || null;
        }
      
        function syncCrosshair(chart, series, dataPoint) {
          if (dataPoint) {
              chart.setCrosshairPosition(dataPoint.value, dataPoint.time, series);
          } else {
            chart.clearCrosshairPosition();
          }
        }
        
        if (mainChartRef.current && breadthChartRef.current && weekChartRef.current) {
          mainChartRef.current.subscribeCrosshairMove(param => {
            const dataPoint = getCrosshairDataPoint(mainSeriesRef.current, param);
            syncCrosshair(breadthChartRef.current, breadthSeriesRef.current, dataPoint);
            syncCrosshair(weekChartRef.current, weekSeriesRef.current, dataPoint);
          });
          breadthChartRef.current.subscribeCrosshairMove(param => {
            const dataPoint = getCrosshairDataPoint(breadthSeriesRef.current, param);
            
            syncCrosshair(mainChartRef.current, mainSeriesRef.current, dataPoint);
            syncCrosshair(weekChartRef.current, weekSeriesRef.current, dataPoint);
          });
          weekChartRef.current.subscribeCrosshairMove(param => {
            const dataPoint = getCrosshairDataPoint(weekSeriesRef.current, param);
            syncCrosshair(mainChartRef.current, mainSeriesRef.current, dataPoint);
            syncCrosshair(breadthChartRef.current, breadthSeriesRef.current, dataPoint);
          });
          mainChartRef.current.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
            breadthChartRef.current.timeScale().setVisibleLogicalRange(timeRange);
            weekChartRef.current.timeScale().setVisibleLogicalRange(timeRange);
          });
          breadthChartRef.current.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
            mainChartRef.current.timeScale().setVisibleLogicalRange(timeRange);
            weekChartRef.current.timeScale().setVisibleLogicalRange(timeRange);
          });
          weekChartRef.current.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
            mainChartRef.current.timeScale().setVisibleLogicalRange(timeRange);
            breadthChartRef.current.timeScale().setVisibleLogicalRange(timeRange);
          });
        }
      }
    }

  }, [chartData]);

  useEffect(() => {
    console.log('selected changed',selectedIndex);
    const fetchChartData = async (index, startDate, endDate) => {
      const response = await fetch(`http://127.0.0.1:5000/api/index_kline?index=${index}&start_date=${startDate}&end_date=${endDate}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    };

    const loadMoreData = async (index) => {
      

      const chartData = chartDataRef.current;
      if (chartData.length == 0) {
        return;
      }
      const data = chartData[chartData.length-1];

      const currentStartDate = new Date(data.startDate);

      // 计算新的 endDate 为 currentStartDate 的前一天
      const newEndDate = new Date(currentStartDate);
      newEndDate.setDate(newEndDate.getDate() - 1);
    
      // 计算新的 startDate 为 currentStartDate 的前一年的同一天
      const newStartDate = new Date(currentStartDate);
      newStartDate.setFullYear(newStartDate.getFullYear() - 1);
    
      // 格式化日期为字符串
      const endDate = newEndDate.toISOString().split('T')[0];
      const startDate = newStartDate.toISOString().split('T')[0];
    



      const indexData = chartData.find(item => {
        return item.key == `${startDate}-${endDate}`
      });
      if (indexData) {
        return;
      }
      const moreData = await fetchChartData(index, startDate, endDate);
      const moreIndexData = new IndexData(startDate, endDate ,moreData);
      setChartData(prevData => {

        return [...prevData,moreIndexData]});
    };


    const debouncedLoadMoreData = _.debounce(loadMoreData, 1000);

    const initializeChart = async (index) => {

      try {
        setIsLoading(true);
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const data = await fetchChartData(index, startDate, endDate);
        const indexData = new IndexData(startDate,endDate,data);
        setChartData([indexData]);

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
            visible: true,
          },
          timeScale: {
            borderColor: 'rgba(197, 203, 206, 0.8)',
            timeVisible: true,
            secondsVisible: false,
          },
          crosshair: {
            mode: 0, // 启用正常模式的光标
            horzLine: {
              color: "#9B7DFF",
              labelBackgroundColor: "#9B7DFF",
            },
          },
          
        });
        mainChart.priceScale('right').applyOptions({
          visible: true, // 确保价格刻度是可见的
        });
        mainChart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
          if (logicalRange) {
            // 检查是否需要加载更多数据
            if (logicalRange.from < 0) {
              debouncedLoadMoreData(index);
            }
          }
        });
        const {mainSeries,ma5Series,ma10Series,ma20Series,ma50Series,ma200Series,volumeSeries} = buildMainChart(mainChart);   
        mainSeriesRef.current = mainSeries;
        ma5SeriesRef.current = ma5Series;
        ma10SeriesRef.current = ma10Series;
        ma20SeriesRef.current = ma20Series;
        ma50SeriesRef.current = ma50Series;
        ma200SeriesRef.current = ma200Series;
        volumeSeriesRef.current = volumeSeries;
        mainChartRef.current = mainChart;
      
      
        const breadthChart = createChart(document.getElementById('breadth-chart'), { width: document.getElementById('breadth-chart').clientWidth, height: 100 });
        breadthChartRef.current = breadthChart;
        const breadthSeries = buildBreadthChart(breadthChart);
        breadthSeriesRef.current = breadthSeries;
        const weekChart = createChart(document.getElementById('52week-chart'), { width: document.getElementById('52week-chart').clientWidth, height: 100 });
        weekChartRef.current = weekChart;
        const weekSeries = build52WeekChart(weekChart);
        weekSeriesRef.current = weekSeries;
        mainChart.applyOptions({
          timeScale: {
            timeVisible: false,
            tickMarkFormatter: (time, tickMarkType, locale) => {
              const date = new Date(time * 1000);
              return date.toLocaleDateString(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'Asia/Shanghai'
              });
            }
          }
        });

        breadthChart.applyOptions({
          timeScale: {
            tickMarkFormatter: (time, tickMarkType, locale) => {
              const date = new Date(time * 1000);
              return date.toLocaleDateString(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'Asia/Shanghai'
              });
            }
          }
        });
        

        weekChart.applyOptions({
          timeScale: {
            timeVisible: false,
            tickMarkFormatter: (time, tickMarkType, locale) => {
              const date = new Date(time * 1000);
              return date.toLocaleDateString(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                timeZone: 'Asia/Shanghai'
              });
            }
          }
        });

        return () => {
          mainChart.remove();
          breadthChart.remove();
          weekChart.remove();
        };

      } catch (error) {
        console.error('获取数据时出错:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChart(selectedIndex);
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

  function cnvertToKLineData(moreIndexKline) {
    return moreIndexKline.map(item => {
      if (item.time_key && item.open !== null && item.high !== null && item.low !== null && item.close !== null) {
        return {
          time: Math.floor(convertToTimestamp(item.time_key) / 1000), // 确保时间是有效的 Unix 时间戳
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close
        };
      } else {
        console.warn('Invalid data point:', item);
        return null; // 或者根据需要处理无效数据
      }
    }).filter(item => item !== null); 

  }
}

function convertToTimestamp(time_key) {
  const date = new Date(time_key);
  const utc8Time = date.getTime() + 8 * 60 * 60 * 1000;
  return utc8Time;
}

function buildMainChart(mainChart) {
  const mainSeries = buildIndex(mainChart);
  const {ma5Series,ma10Series,ma20Series,ma50Series,ma200Series} = buildMa(mainChart);
  const volumeSeries = buildVolume(mainChart);
  
  mainChart.subscribeCrosshairMove((param) => {
    const tooltip = document.getElementById('tooltip');
    if (!param || !param.time || !param.point) {
      tooltip.style.display = 'none';
      return;
    }
  
    const price = param.seriesData.get(mainSeries);
    const ma5Price = param.seriesData.get(ma5Series);
    const ma10Price = param.seriesData.get(ma10Series);
    const ma20Price = param.seriesData.get(ma20Series);
    const ma50Price = param.seriesData.get(ma50Series);
    const ma200Price = param.seriesData.get(ma200Series);
    const volume = param.seriesData.get(volumeSeries);

    if (price) {
      const { open, high, low, close } = price;
      let tooltipContent = `
        <div>开盘价: ${open}</div>
        <div>最高价: ${high}</div>
        <div>最低价: ${low}</div>
        <div>收盘价: ${close}</div>
      `;

      if (ma5Price) {
        tooltipContent += `<div>MA5: ${ma5Price.value}</div>`;
      }

      if (ma10Price) {
        tooltipContent += `<div>MA10: ${ma10Price.value}</div>`;
      }

      if (ma20Price) {
        tooltipContent += `<div>MA20: ${ma20Price.value}</div>`;
      }

      if (ma50Price) {
        tooltipContent += `<div>MA50: ${ma50Price.value}</div>`;
      }

      if (ma200Price) {
        tooltipContent += `<div>MA200: ${ma200Price.value}</div>`;
      }

      if (volume) {
        tooltipContent += `<div>成交量: ${volume.value}</div>`;
      }

      tooltip.innerHTML = tooltipContent;
      tooltip.style.display = 'block';

      // 确保工具提示不与鼠标重叠
      const offsetX = 10;
      const offsetY = 10;
      tooltip.style.left = (param.point.x + offsetX) + 'px';
      tooltip.style.top = (param.point.y + offsetY) + 'px';
    }
  });
  return {mainSeries,ma5Series,ma10Series,ma20Series,ma50Series,ma200Series,volumeSeries};
}

function build52WeekChart(weekChart) {
  const netHighLowSeries = weekChart.addHistogramSeries();
  return netHighLowSeries;
}

function buildVolume(indexChart) {
  
  const volumeSeries = indexChart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: 'volume'
  });

  indexChart.priceScale('volume').applyOptions({
    visible: true,
    scaleMargins: {
      top: 0.8,
      bottom: 0,
    },
  });

  return volumeSeries;
}

function setVolumeSeries(indexKline, volumeSeries) {
  const formattedVolumeData = indexKline.map(item => ({
    time: Math.floor(convertToTimestamp(item.time_key) / 1000),
    value: item.turnover,
    color: item.close > item.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
  }));
  volumeSeries.setData(formattedVolumeData);
}

function buildIndex(indexChart) {

  const mainSeries = indexChart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    priceScaleId: 'index',
  });

  return mainSeries;
}

function buildMa(indexChart) {
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
    priceScaleId: 'ma10',
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

  return {ma5Series,ma10Series,ma20Series,ma50Series,ma200Series};
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


