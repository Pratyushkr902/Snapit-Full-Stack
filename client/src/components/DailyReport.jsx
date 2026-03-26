import React, { useEffect, useState } from 'react';
import Axios from '../utils/Axios';
import { DisplayPriceInRupees } from '../utils/DisplayPriceInRupees';

const DailyReport = () => {
    const [reportData, setReportData] = useState([]);

    const fetchReport = async () => {
        const response = await Axios.get('/api/order/daily-report');
        if (response.data.success) setReportData(response.data.data);
    };

    useEffect(() => { fetchReport(); }, []);

    return (
        <div className='bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100'>
            <div className='flex justify-between items-center mb-6'>
                <h3 className='font-black text-slate-800 uppercase text-sm'>Daily Sales Report (By Mart)</h3>
                <button onClick={fetchReport} className='text-[10px] font-bold text-blue-600 underline'>REFRESH</button>
            </div>

            <div className='overflow-x-auto'>
                <table className='w-full text-left'>
                    <thead>
                        <tr className='text-[10px] uppercase text-slate-400 border-b'>
                            <th className='pb-3'>Mart Name</th>
                            <th className='pb-3'>Orders</th>
                            <th className='pb-3'>COD Cash</th>
                            <th className='pb-3'>Total Revenue</th>
                        </tr>
                    </thead>
                    <tbody className='text-xs font-bold'>
                        {reportData.map((item) => (
                            <tr key={item._id} className='border-b last:border-0 hover:bg-slate-50'>
                                <td className='py-4 text-slate-700'>{item._id || "Unknown Store"}</td>
                                <td className='py-4'>{item.totalOrders}</td>
                                <td className='py-4 text-orange-600'>{DisplayPriceInRupees(item.codCollected)}</td>
                                <td className='py-4 text-green-600'>{DisplayPriceInRupees(item.totalRevenue)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className='mt-4 p-4 bg-slate-900 rounded-2xl text-white flex justify-between items-center'>
                <span className='text-[10px] font-black uppercase'>Paliganj Total:</span>
                <span className='text-lg font-black'>
                    {DisplayPriceInRupees(reportData.reduce((acc, curr) => acc + curr.totalRevenue, 0))}
                </span>
            </div>
        </div>
    );
};

export default DailyReport;