import { useEffect, useRef } from "react";

function NeonBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animationFrameId;
        let particles = [];
        
        // Coordenadas del mouse
        let mouse = { x: null, y: null, radius: 150 };

        const colors = ['#00bfff', '#ff4d4d']; 

        // tamano de canvas
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles(); 
        };


        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                // velocidad random
                this.vx = (Math.random() - 0.5) * 1.5;
                this.vy = (Math.random() - 0.5) * 1.5;
                this.radius = Math.random() * 2 + 2;
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }

            update() {
                // Rebote en los bordes
                if (this.x + this.radius > canvas.width || this.x - this.radius < 0) this.vx = -this.vx;
                if (this.y + this.radius > canvas.height || this.y - this.radius < 0) this.vy = -this.vy;


                this.x += this.vx;
                this.y += this.vy;

                this.draw();
            }
        }

        // Inicializar arreglo de partículas
        const initParticles = () => {
            particles = [];
            // cantidad de nodos segun tamanio de la pantalla
            const numberOfParticles = (canvas.width * canvas.height) / 9000;
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(new Particle());
            }
        };

        // dibujado de lineas entre nodos
        const connectParticles = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Conexion entre nodos
                    if (distance < 120) {
                        const opacity = 1 - (distance / 120);
                        ctx.strokeStyle = `rgba(0, 191, 255, ${opacity * 0.5})`; 
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }

                // conexion con el mouse
                if (mouse.x != null && mouse.y != null) {
                    const dxMouse = particles[a].x - mouse.x;
                    const dyMouse = particles[a].y - mouse.y;
                    const distanceMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

                    if (distanceMouse < mouse.radius) {
                        ctx.strokeStyle = `rgba(255, 77, 77, 0.6)`;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                }
            }
        };

        // Bucle principal de animación
        const animate = () => {
            // Limpiar frame anterior
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Actualizar nodos y conexiones
            particles.forEach(particle => particle.update());
            connectParticles();
            
            animationFrameId = requestAnimationFrame(animate);
        };

        
        window.addEventListener("resize", resizeCanvas);
        window.addEventListener("mousemove", (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });
        window.addEventListener("mouseout", () => {
            mouse.x = null;
            mouse.y = null;
        });

        // Ejecucion inicial
        resizeCanvas();
        animate();

        // Cleanup al desmontar el componente
        return () => {
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousemove", null);
            window.removeEventListener("mouseout", null);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-bg-deep pointer-events-auto">
            <div className="absolute bottom-0 left-0 w-full h-[40%] opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(transparent 95%, var(--color-neon-blue) 100%), linear-gradient(90deg, transparent 95%, var(--color-neon-blue) 100%)', backgroundSize: '40px 40px', transform: 'perspective(500px) rotateX(60deg)' }}>
            </div>
            
            <canvas 
                ref={canvasRef} 
                className="block w-full h-full drop-shadow-[0_0_8px_var(--color-neon-blue)]"
            />
        </div>
    );
}

export default NeonBackground;