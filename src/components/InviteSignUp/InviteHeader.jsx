import Icon from "../Icon";

const InviteHeader = () => (
  <div className="text-center mb-6">
    <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon name="key" size={32} className="text-orange-500" />
    </div>
    <h1 className="text-2xl font-bold text-white">
      Join UE5 Question Generator
    </h1>
    <p className="text-slate-400 text-sm mt-2">
      Enter your invite code to get started
    </p>
  </div>
);

export default InviteHeader;
