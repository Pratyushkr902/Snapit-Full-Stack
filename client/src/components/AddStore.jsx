import React, { useState } from 'react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';

const AddStore = ({ fetchStores }) => {
    const [data, setData] = useState({ name: "", address: "", lat: "", lng: "", phone: "" });

    const handleAddStore = async (e) => {
        e.preventDefault();
        try {
            const response = await Axios({ ...SummaryApi.addStore, data });
            if (response.data.success) {
                toast.success("Mart Registered in Paliganj!");
                setData({ name: "", address: "", lat: "", lng: "", phone: "" });
                if(fetchStores) fetchStores();
            }
        } catch (error) { toast.error("Failed to add Mart"); }
    };

    return (
        <form onSubmit={handleAddStore} className='bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 grid gap-4'>
            <h3 className='font-black text-slate-800 uppercase'>Register New Mart</h3>
            <input type="text" placeholder="Mart Name (e.g. Paliganj Bazar Mart)" className='p-3 bg-slate-50 rounded-xl outline-none' 
                   onChange={e => setData({...data, name: e.target.value})} value={data.name} required />
            <div className='grid grid-cols-2 gap-2'>
                <input type="number" step="any" placeholder="Latitude" className='p-3 bg-slate-50 rounded-xl outline-none' 
                       onChange={e => setData({...data, lat: e.target.value})} value={data.lat} required />
                <input type="number" step="any" placeholder="Longitude" className='p-3 bg-slate-50 rounded-xl outline-none' 
                       onChange={e => setData({...data, lng: e.target.value})} value={data.lng} required />
            </div>
            <button className='bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest'>Add Mart to Network</button>
        </form>
    );
};