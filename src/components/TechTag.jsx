function TechTag({ etiqueta }) {
    const isAlert = etiqueta === "Aviso" || etiqueta === "Urgente";

    const textColor = isAlert ? "text-danger" : "text-accent";
    const bgColor = isAlert ? "bg-danger/10" : "bg-accent/10";
    const borderColor = isAlert ? "border-danger/40" : "border-accent/40";
    const glowClass = isAlert ? "shadow-glow-danger" : "shadow-glow";
    const indicatorColor = isAlert ? "bg-danger" : "bg-accent";

    return (
        <div className={`relative inline-flex items-center gap-2 px-3 py-1 rounded-full border ${bgColor} ${borderColor} ${glowClass}`}>

            <div className="flex gap-0.5 items-center">
                <div className={`w-1 h-2.5 rounded-full ${indicatorColor} opacity-90`}></div>
                <div className={`w-1 h-1.5 rounded-full ${indicatorColor} opacity-50`}></div>
            </div>

            <span className={`font-bold tracking-widest uppercase text-2xs ${textColor} mt-px`}>
                {etiqueta}
            </span>

            <div className={`w-2 h-0.5 rounded-full ${indicatorColor} opacity-60 ml-0.5`}></div>

        </div>
    );
}

export default TechTag;