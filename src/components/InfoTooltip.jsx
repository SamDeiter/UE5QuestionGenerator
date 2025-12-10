import Icon from './Icon';

const InfoTooltip = ({ text, direction = "up" }) => (
    <div className="group relative inline-flex items-center ml-1.5 align-middle">
        <Icon name="info" size={12} className="text-slate-600 hover:text-orange-500 cursor-help transition-colors" />
        <div className={`invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 absolute left-1/2 -translate-x-1/2 w-48 p-2.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] leading-relaxed rounded-md shadow-xl z-50 pointer-events-none text-center ${direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
            {text}
            <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${direction === 'down' ? 'bottom-full border-b-slate-800' : 'top-full border-t-slate-800'}`}></div>
        </div>
    </div>
);

export default InfoTooltip;
