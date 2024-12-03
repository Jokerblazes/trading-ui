import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import './styles.css';
import _ from 'lodash';


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

// Loading 组件
const LoadingSpinner = () => {
  console.log('Loading Spinner Rendered'); // 添加日志
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}
    >
      <div 
        style={{
          width: '64px',
          height: '64px',
          border: '8px solid #f3f3f3',
          borderTop: '8px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
    </div>
  );
};

// Error 组件
const ErrorMessage = ({ message }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75">
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
      <div className="flex items-center mb-4">
        <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-800">出错了</h2>
      </div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

function MainApp() {

  const chartContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState('HK.800000');
  const [chartData, setChartData] = useState([]);
  const [maVisibility, setMaVisibility] = useState({
    ma5: true,
    ma10: true,
    ma20: true,
    ma50: true,
    ma200: true,
  });

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
  const maVisibilityRef = useRef(maVisibility);

  useEffect(() => {
    maVisibilityRef.current = maVisibility;
    if (mainChartRef.current) {
      const a = [{key:'ma5',series:ma5SeriesRef.current},{key:'ma10',series:ma10SeriesRef.current},{key:'ma20',series:ma20SeriesRef.current},{key:'ma50',series:ma50SeriesRef.current},{key:'ma200',series:ma200SeriesRef.current}];
      a.forEach((item) => {
        item.series.applyOptions({ visible: maVisibility[item.key] });
      });
    }
    
  }, [maVisibility]);


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

        const maData = indexData.map(item => ({
          time: Math.floor(convertToTimestamp(item.time_key) / 1000),
          value: parseFloat(item.ma.ma_5)
        }));
        ma5SeriesRef.current.setData(maData);

        const ma10Data = indexData.map(item => ({
          time: Math.floor(convertToTimestamp(item.time_key) / 1000),
          value: parseFloat(item.ma.ma_10)
        }));
        ma10SeriesRef.current.setData(ma10Data);

        const ma20Data = indexData.map(item => ({
          time: Math.floor(convertToTimestamp(item.time_key) / 1000),
          value: parseFloat(item.ma.ma_20)
        }));
        ma20SeriesRef.current.setData(ma20Data);

        const ma50Data = indexData.map(item => ({
          time: Math.floor(convertToTimestamp(item.time_key) / 1000),
          value: parseFloat(item.ma.ma_50)
        }));
        ma50SeriesRef.current.setData(ma50Data);

        const ma200Data = indexData.map(item => ({
          time: Math.floor(convertToTimestamp(item.time_key) / 1000),
          value: parseFloat(item.ma.ma_200)
        }));

        ma200SeriesRef.current.setData(ma200Data);
        const breadthData = chartData.flatMap(item => item.value.breadth).sort((a, b) => {
          const timeA = Date.parse(a.date);
          const timeB = Date.parse(b.date);
          return timeA - timeB;
        }).map(item => ({
          time: Math.floor(convertToTimestamp(item.date) / 1000),
          value: item.value
        }));

        breadthSeriesRef.current.setData(breadthData);
        const weekData = chartData.flatMap(item => item.value.net_high_low).sort((a, b) => {
          const timeA = Date.parse(a.date);
          const timeB = Date.parse(b.date);
          return timeA - timeB;
        }).map(item => ({
          time: Math.floor(convertToTimestamp(item.date) / 1000),
          value: item.value
        }));
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
    const fetchChartData = async (index, startDate, endDate) => {
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/index_kline?index=${index}&start_date=${startDate}&end_date=${endDate}`);
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
          const maVisibility = maVisibilityRef.current;
          
          if (maVisibility.ma5 && ma5Price) {
            tooltipContent += `<div>MA5: ${ma5Price.value}</div>`;
          }
    
          if (maVisibility.ma10 && ma10Price) {
            tooltipContent += `<div>MA10: ${ma10Price.value}</div>`;
          }
    
          if (maVisibility.ma20 && ma20Price) {
            tooltipContent += `<div>MA20: ${ma20Price.value}</div>`;
          }
    
          if (maVisibility.ma50 && ma50Price) {
            tooltipContent += `<div>MA50: ${ma50Price.value}</div>`;
          }
    
          if (maVisibility.ma200 && ma200Price) {
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

  const handleMaVisibilityChange = (event) => {
    const { name, checked } = event.target;
    setMaVisibility((prev) => ({ ...prev, [name]: checked }));
  };
  const styles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
  if (isLoading) {
    return (
      <>
        <style>{styles}</style>
        <LoadingSpinner />
      </>
    );
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="p-4 bg-white">
      {/* 控制面板 */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-lg shadow-sm">
        {/* 指数选择器 */}
        <div className="relative">
          <select 
            id="index-selector" 
            onChange={handleIndexChange} 
            value={selectedIndex}
            className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-blue-500 transition-colors"
          >
            <option value="HK.800000">恒生指数</option>
            <option value="HK.800700">恒生科技指数</option>
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* MA 选项组 */}
        <div className="flex flex-wrap gap-4">
          {[
            { name: 'ma5', label: 'MA5', color: '#FF0000' },
            { name: 'ma10', label: 'MA10', color: '#00FF00' },
            { name: 'ma20', label: 'MA20', color: '#0000FF' },
            { name: 'ma50', label: 'MA50', color: '#FFA500' },
            { name: 'ma200', label: 'MA200', color: '#800080' }
          ].map(({ name, label, color }) => (
            <label key={name} className="flex items-center space-x-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  name={name}
                  checked={maVisibility[name]}
                  onChange={handleMaVisibilityChange}
                  className="sr-only"
                />
                <div className={`
                  w-4 h-4 border rounded
                  ${maVisibility[name] ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}
                  transition-colors duration-200
                `}>
                  {maVisibility[name] && (
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium" style={{ color }}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 图表容器 */}
      <div ref={chartContainerRef} className="border rounded-lg shadow-sm">
        <div id="index-chart" className="border-b"></div>
        <div id="breadth-chart" className="border-b"></div>
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

export default MainApp;
function convertToTimestamp(time_key) {
  const date = new Date(time_key);
  const utc8Time = date.getTime() + 8 * 60 * 60 * 1000;
  return utc8Time;
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
    color: '#FF0000',
    lineWidth: 2,
    title: 'MA5',
    priceScaleId: 'ma5',
  });

  const ma10Series = indexChart.addLineSeries({
    color: '#00FF00',
    lineWidth: 2,
    title: 'MA10',
    priceScaleId: 'ma10',
  });

  const ma20Series = indexChart.addLineSeries({
    color: '#0000FF',
    lineWidth: 2,
    title: 'MA20',
    priceScaleId: 'ma20',
  });

  const ma50Series = indexChart.addLineSeries({
    color: '#FFA500',
    lineWidth: 2,
    title: 'MA50',
    priceScaleId: 'ma50',
  });

  const ma200Series = indexChart.addLineSeries({
    color: '#800080',
    lineWidth: 2,
    title: 'MA200',
    priceScaleId: 'ma200',
  });

  return { ma5Series, ma10Series, ma20Series, ma50Series, ma200Series };
}


