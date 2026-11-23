function TechTag({ etiqueta }) {
    const isAlert = etiqueta === "Aviso" || etiqueta === "Urgente";

    const textColor = isAlert ? "text-neon-red" : "text-neon-blue";
    const bgColor = isAlert ? "bg-neon-red/10" : "bg-neon-blue/10";
    const borderColor = isAlert ? "border-neon-red/40" : "border-neon-blue/40";
    const glowClass = isAlert ? "shadow-[0_0_12px_rgba(255,77,77,0.3)]" : "shadow-[0_0_12px_rgba(0,191,255,0.3)]";
    const indicatorColor = isAlert ? "bg-neon-red" : "bg-neon-blue";

    return (
        <div className={`relative inline-flex items-center gap-2 px-3 py-1 rounded-full border ${bgColor} ${borderColor} ${glowClass}`}>

            <div className="flex gap-0.5 items-center">
                <div className={`w-1 h-2.5 rounded-full ${indicatorColor} opacity-90`}></div>
                <div className={`w-1 h-1.5 rounded-full ${indicatorColor} opacity-50`}></div>
            </div>

            <span className={`font-bold tracking-widest uppercase text-[11px] ${textColor} mt-px`}>
                {etiqueta}
            </span>

            <div className={`w-2 h-0.5 rounded-full ${indicatorColor} opacity-60 ml-0.5`}></div>

        </div>
    );
}

export default TechTag;