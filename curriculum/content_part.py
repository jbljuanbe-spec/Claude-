# ---------------------------------------------------------------- datos comunes

CONTACT_ES = ("Madrid, España  ·  disponible desde enero 2027  ·  +34 610 269 867  ·  +39 388 245 3480\n"
              "benitezlopezjuancontact@gmail.com  ·  linkedin.com/in/juanbenitez")
CONTACT_EN = ("Madrid, Spain  ·  available from January 2027  ·  +34 610 269 867  ·  +39 388 245 3480\n"
              "benitezlopezjuancontact@gmail.com  ·  linkedin.com/in/juanbenitez")
NAME = "JUAN BENÍTEZ LÓPEZ"

IDIOMAS_ES = "Español nativo  ·  Inglés C1  ·  Italiano C1 (vida y trabajo en Italia desde 2026)"
LANGS_EN = "Spanish (native)  ·  English (C1)  ·  Italian (C1 — living and working in Italy since 2026)"


def formacion_es(doc, full=True, master=True, diplo=True):
    section(doc, "Formación")
    edu(doc, "V Programa de Técnicos de Comercio Exterior", "Sept. 2025 – Dic. 2026",
        "Cámara de Comercio de Madrid · Comunidad de Madrid",
        "Programa selectivo: 20 plazas en la Red ICEX a nivel nacional. 300 h en medios de pago, Incoterms 2020, "
        "fiscalidad internacional, negociación intercultural y marketing internacional.")
    edu(doc, "Doble Grado en Economía y Ciencia Política", "2019 – 2024",
        "Universidad Rey Juan Carlos")
    if master:
        edu(doc, "Máster en Metodologías Ágiles y Transformación Digital", "2024 – 2025",
            "Universidad Camilo José Cela")
    if diplo:
        edu(doc, "Curso de Política Exterior y Cooperación para el Desarrollo", "Junio 2025",
            "Escuela Diplomática de España (MAEC)")
    if full:
        body(doc, "Formación complementaria: Certificado en Internacionalización Empresarial (ICEX) · "
                  "Construcción de redes para una Comunidad Euroasiática · IT, AI and Capital Flows "
                  "(Asian Development Bank Institute).", size=9.3, color=GREY, space_after=1)


def idiomas_es(doc):
    section(doc, "Idiomas")
    body(doc, IDIOMAS_ES)


# ================================================================= CV 1 — BD INTERNACIONAL

def cv_bd():
    doc = new_doc()
    header_block(doc, NAME,
                 "Desarrollo de Negocio Internacional  ·  Expansión de mercados  ·  Europa y EMEA",
                 CONTACT_ES)

    section(doc, "Perfil")
    body(doc, "Economista con experiencia en desarrollo de negocio internacional desde tres ángulos que rara vez "
              "se combinan: la red exterior del Estado (Oficina Económica y Comercial de España en Milán), una "
              "multinacional industrial de defensa y aeroespacio (Airbus Helicopters) y una Big Four (KPMG). "
              "Detecto oportunidades de mercado, construyo el business case y lo sostengo con datos hasta la "
              "decisión. Trilingüe español–inglés–italiano, con red propia de contactos institucionales y "
              "empresariales en Italia.")

    section(doc, "Logros destacados")
    bullet(doc, "el más rentable de la compañía en 2024, con negociación directa con proveedores internacionales.",
           bold_lead="Programa H135 de Airbus Helicopters: ")
    bullet(doc, "y +30 % de mejora en la eficiencia de reporting, con interlocución directa con el CFO.",
           bold_lead="+1.000 proyectos analizados en KPMG ")
    bullet(doc, "4 instalaciones, 15+ empresas y visita institucional de la CEO de ICEX.",
           bold_lead="Coordinación de la presencia española en Milano Design Week 2026: ")
    bullet(doc, "de un producto digital propio a +180.000 usuarios en dos semanas con presupuesto de marketing cero.",
           bold_lead="Lanzamiento en solitario ")

    section(doc, "Experiencia profesional")

    role(doc, "Técnico de Comercio Exterior", "Ene. 2026 – Actualidad",
         "Oficina Económica y Comercial de España en Milán (ICEX)  ·  Milán, Italia")
    bullet(doc, "Identificación y cualificación de oportunidades de mercado para empresas españolas en Italia: "
                "análisis de demanda, mapeo competitivo, evaluación de canales de entrada y selección de partners "
                "locales (distribuidores, agentes, importadores).")
    bullet(doc, "Inteligencia regulatoria y de licitaciones sobre los grandes marcos de inversión italianos: "
                "PNRR (125.000 M€), Transizione 5.0 e infraestructuras ligadas a Milano-Cortina 2026.")
    bullet(doc, "Estudios sectoriales y business intelligence con verificación cruzada de fuentes oficiales "
                "(Eurostat, ISTAT, INE, TARIC) e informes ejecutivos para comités de decisión de empresas en "
                "proceso de expansión.")
    bullet(doc, "Gestión de stakeholders a alto nivel: asociaciones sectoriales españolas (ASCER, ANIEME), "
                "patronales italianas, embajada, cámaras bilaterales y filiales españolas en Italia.")
    bullet(doc, "Coordinación transversal de la presencia institucional española en Milano Design Week 2026: "
                "4 instalaciones, más de 15 empresas y acompañamiento a la visita de la CEO de ICEX.")
    bullet(doc, "Cobertura de ferias internacionales (Cosmoprof Bologna, Salone del Mobile, Pitti Uomo): "
                "+24 stands trabajados, levantamiento de información de mercado y fichas comerciales de seguimiento.")

    role(doc, "Financial & Business Controller", "Jul. 2025 – Oct. 2025",
         "KPMG  ·  Madrid, España")
    bullet(doc, "Análisis de rentabilidad y márgenes de más de 1.000 proyectos de la firma, con identificación de "
                "palancas de mejora y reporting estratégico directo al CFO.")
    bullet(doc, "Rediseño del proceso y la interfaz de carga de datos en CRM para gerentes de proyecto: "
                "+30 % de eficiencia en el ciclo de reporting.")

    role(doc, "Controller de Programas Comerciales", "Mar. 2024 – Abr. 2025",
         "Airbus Helicopters España  ·  Albacete, España")
    bullet(doc, "Programa H135, el más rentable de la compañía en 2024: gestión transversal de KPIs, plazos de "
                "entrega a cliente y aseguramiento de calidad en un entorno aeroespacial regulado.")
    bullet(doc, "Negociación con proveedores internacionales en contratos de navalización: mejora de márgenes "
                "vía renegociación de condiciones comerciales y pliegos técnicos.")
    bullet(doc, "Business case del programa: cierres mensuales, forecasts, seguimiento de riesgos y oportunidades "
                "y reporting financiero al CFO.")

    role(doc, "Prácticas en Gerencia de Urbanismo", "2023 – 2024",
         "Ayuntamiento de Móstoles  ·  Móstoles, España")
    bullet(doc, "Apoyo a auditorías públicas, gestión de facturación y mejora de procesos administrativos a partir "
                "de análisis de datos.")

    section(doc, "Proyecto propio")
    role(doc, "Hazte con Todos — producto digital lanzado en solitario", "2026",
         "Proyecto personal  ·  Cloudflare Pages + D1")
    bullet(doc, "Simulador web de carrera profesional construido de extremo a extremo (producto, datos, desarrollo "
                "e infraestructura) y lanzado sin presupuesto de marketing.")
    bullet(doc, "+180.000 visitas en dos semanas, ~15.000 partidas completadas al día y ~151.000 partidas "
                "registradas en base de datos.")
    bullet(doc, "Crecimiento 100 % orgánico mediante una mecánica de compartición viral diseñada a propósito: "
                "una tarjeta de resultado que el propio usuario distribuye.")
    bullet(doc, "Construido con uso avanzado de IA (Claude Code): validación de una idea a escala real en semanas "
                "y con coste operativo marginal.")

    formacion_es(doc)

    section(doc, "Competencias")
    skill_line(doc, "Desarrollo de negocio",
               "identificación y cualificación de oportunidades, business cases, market entry, mapeo de competidores "
               "y partners, negociación internacional.")
    skill_line(doc, "Inteligencia de mercado",
               "metodología ICEX, fuentes oficiales (Eurostat, ISTAT, INE, TARIC, OCDE), seguimiento regulatorio y "
               "de licitaciones (PNRR, fondos UE).")
    skill_line(doc, "Análisis financiero",
               "Excel avanzado, KPIs, rentabilidad, forecasting y reporting a alta dirección como soporte a la "
               "decisión estratégica.")
    skill_line(doc, "Sectores",
               "aeroespacial y defensa, industria y bienes de equipo, energía, bienes de consumo (hábitat, cerámica, "
               "moda, cosmética), servicios profesionales.")
    skill_line(doc, "Herramientas",
               "Excel avanzado, Power BI, Power Automate, SAP, CRM, SQL básico; uso avanzado de IA aplicada "
               "(Claude, ChatGPT) a análisis y automatización.")

    idiomas_es(doc)
    doc.save(os.path.join(OUT, "CV_JuanBenitez_1_DesarrolloNegocio.docx"))


# ================================================================= CV 2 — DEFENSA Y AEROESPACIAL

def cv_defensa():
    doc = new_doc()
    header_block(doc, NAME,
                 "Defensa y Aeroespacial  ·  Gestión de Programas  ·  Desarrollo de Negocio Internacional",
                 CONTACT_ES)

    section(doc, "Perfil")
    body(doc, "Economista con experiencia en gestión y control de programas aeroespaciales en Airbus Helicopters "
              "—incluido el H135, el programa más rentable de la compañía en 2024— y en promoción exterior desde "
              "la red económica y comercial del Estado español en Milán. Combino el conocimiento del interior de "
              "un programa industrial regulado (KPIs, hitos, proveedores, calidad, márgenes) con la capacidad de "
              "abrir mercado fuera: inteligencia regulatoria, licitaciones públicas y relación institucional. "
              "Trilingüe español–inglés–italiano.")

    section(doc, "Logros destacados")
    bullet(doc, "gestión de KPIs, plazos y calidad en entorno aeroespacial regulado.",
           bold_lead="Programa H135, el más rentable de Airbus Helicopters España en 2024: ")
    bullet(doc, "en contratos de navalización, con mejora de márgenes vía renegociación de condiciones y pliegos técnicos.",
           bold_lead="Negociación con proveedores internacionales ")
    bullet(doc, "sobre PNRR italiano (125.000 M€), Transizione 5.0 e infraestructuras Milano-Cortina 2026.",
           bold_lead="Inteligencia de licitaciones y política industrial ")
    bullet(doc, "reporting estratégico al CFO en Airbus y en KPMG (+1.000 proyectos analizados).",
           bold_lead="Interlocución financiera con dirección: ")

    section(doc, "Experiencia profesional")

    role(doc, "Técnico de Comercio Exterior", "Ene. 2026 – Actualidad",
         "Oficina Económica y Comercial de España en Milán (ICEX)  ·  Milán, Italia")
    bullet(doc, "Inteligencia regulatoria y de licitaciones sobre los marcos de inversión pública italianos "
                "relevantes para la industria española: PNRR, Transizione 5.0, política industrial y energética "
                "de la UE y programas de infraestructura ligados a Milano-Cortina 2026.")
    bullet(doc, "Identificación de oportunidades y partners industriales en Italia: mapeo de competidores, "
                "canales de entrada y evaluación de distribuidores y socios locales.")
    bullet(doc, "Interlocución institucional con asociaciones sectoriales, patronales italianas, embajada y "
                "cámaras bilaterales; apoyo directo al Consejero Económico y Comercial Jefe.")
    bullet(doc, "Estudios de mercado conforme a metodología oficial ICEX con verificación cruzada de fuentes "
                "(Eurostat, ISTAT, INE, TARIC) e informes ejecutivos para empresas exportadoras.")
    bullet(doc, "Coordinación de la presencia institucional española en ferias y eventos internacionales, "
                "incluida Milano Design Week 2026 (4 instalaciones, 15+ empresas).")

    role(doc, "Controller de Programas Comerciales", "Mar. 2024 – Abr. 2025",
         "Airbus Helicopters España  ·  Albacete, España")
    bullet(doc, "Programa H135 —el más rentable de la compañía en 2024—: gestión transversal de KPIs estratégicos, "
                "control de plazos de entrega a cliente y aseguramiento de calidad bajo estándares aeroespaciales.")
    bullet(doc, "Negociación con proveedores internacionales en contratos de navalización: análisis de pliegos "
                "técnicos, renegociación de condiciones comerciales y mejora del margen del programa.")
    bullet(doc, "Business case y control del programa: cierres mensuales, forecasts, seguimiento estructurado de "
                "riesgos y oportunidades y reporting financiero directo al CFO.")
    bullet(doc, "Coordinación entre ingeniería, compras, calidad y finanzas en un entorno multinacional y "
                "multi-planta.")

    role(doc, "Financial & Business Controller", "Jul. 2025 – Oct. 2025",
         "KPMG  ·  Madrid, España")
    bullet(doc, "Análisis de rentabilidad, márgenes y desviaciones de más de 1.000 proyectos, con reporting "
                "estratégico al CFO.")
    bullet(doc, "Rediseño del proceso de carga de datos en CRM: +30 % de eficiencia en el ciclo de reporting.")

    role(doc, "Prácticas en Gerencia de Urbanismo", "2023 – 2024",
         "Ayuntamiento de Móstoles  ·  Móstoles, España")
    bullet(doc, "Apoyo a auditorías públicas, contratación y mejora de procesos administrativos mediante análisis "
                "de datos.")

    section(doc, "Proyecto propio")
    role(doc, "Hazte con Todos — producto digital lanzado en solitario", "2026",
         "Proyecto personal  ·  Cloudflare Pages + D1")
    bullet(doc, "Producto web construido de extremo a extremo (diseño, desarrollo, base de datos e infraestructura) "
                "con +180.000 visitas en dos semanas y ~151.000 partidas registradas, sin presupuesto de marketing.")
    bullet(doc, "Ejecución autónoma de un proyecto técnico completo con uso avanzado de IA aplicada (Claude Code) "
                "y despliegue en infraestructura cloud (Cloudflare).")

    formacion_es(doc)

    section(doc, "Competencias")
    skill_line(doc, "Gestión de programas",
               "KPIs, hitos y plazos de entrega, control de calidad, gestión de riesgos y oportunidades, "
               "metodologías ágiles.")
    skill_line(doc, "Compras y negociación",
               "proveedores internacionales, pliegos técnicos, condiciones comerciales, mejora de márgenes.")
    skill_line(doc, "Negocio internacional y licitaciones",
               "inteligencia regulatoria, fondos y programas públicos (PNRR, fondos UE), promoción exterior, "
               "ferias del sector.")
    skill_line(doc, "Control de gestión",
               "cierres mensuales, forecasting, análisis de rentabilidad, reporting a CFO y comité de dirección.")
    skill_line(doc, "Herramientas",
               "SAP, Excel avanzado, Power BI, Power Automate, CRM; IA aplicada (Claude, ChatGPT) a análisis y "
               "automatización.")

    idiomas_es(doc)
    doc.save(os.path.join(OUT, "CV_JuanBenitez_2_DefensaAeroespacial.docx"))


# ================================================================= CV 3 — COMERCIO EXTERIOR

def cv_comex():
    doc = new_doc()
    header_block(doc, NAME,
                 "Comercio Exterior e Internacionalización  ·  Asociaciones sectoriales y cámaras  ·  Mercado italiano",
                 CONTACT_ES)

    section(doc, "Perfil")
    body(doc, "Técnico de comercio exterior formado en el V Programa de la Cámara de Comercio de Madrid "
              "(20 plazas en la Red ICEX a nivel nacional) y en ejercicio en la Oficina Económica y Comercial de "
              "España en Milán, donde acompaño a empresas españolas en su entrada y consolidación en Italia. "
              "Domino el ciclo internacional completo —estudio de mercado, prospección de distribuidores, ferias, "
              "Incoterms y medios de pago— con base financiera sólida de Airbus Helicopters y KPMG. "
              "Trilingüe español–inglés–italiano.")

    section(doc, "Logros destacados")
    bullet(doc, "trabajados en Cosmoprof Bologna, Salone del Mobile, Milano Design Week y Pitti Uomo, con fichas "
                "comerciales de seguimiento.",
           bold_lead="+24 stands de empresas españolas ")
    bullet(doc, "instalación «Spanish Design as a Souvenir» con Tile of Spain / ASCER (15 empresas cerámicas) e "
                "INTERNI MATERIAE.",
           bold_lead="Coordinación de acciones de promoción en Milano Design Week 2026: ")
    bullet(doc, "según metodología oficial: demanda, oferta, distribución, precios y barreras, con verificación "
                "cruzada de fuentes.",
           bold_lead="Estudios y fichas de sector ICEX ")
    bullet(doc, "ASCER, ANIEME, patronales italianas, cámaras bilaterales y empresas exportadoras españolas.",
           bold_lead="Red de contactos construida en Italia: ")

    section(doc, "Experiencia profesional")

    role(doc, "Técnico de Comercio Exterior", "Ene. 2026 – Actualidad",
         "Oficina Económica y Comercial de España en Milán (ICEX)  ·  Milán, Italia")
    bullet(doc, "Apoyo a la internacionalización de empresas españolas en Italia: identificación de distribuidores "
                "e importadores, agendas comerciales, briefings sectoriales y misiones directas e inversas.")
    bullet(doc, "Cobertura de ferias internacionales (Cosmoprof Bologna, Salone del Mobile, Milano Design Week, "
                "Pitti Uomo): más de 24 stands visitados, levantamiento de información de mercado y elaboración "
                "de fichas comerciales posteriores.")
    bullet(doc, "Estudios y fichas de sector conforme a metodología oficial ICEX: análisis de demanda, oferta, "
                "canales de distribución, precios y barreras de acceso; verificación cruzada de fuentes (INE, "
                "ISTAT, Eurostat, TARIC, asociaciones sectoriales) y gráficos en plantilla institucional.")
    bullet(doc, "Coordinación logística y de contenidos de acciones de promoción comercial durante Milano Design "
                "Week 2026: «Spanish Design as a Souvenir» (Tile of Spain / ASCER, 15 empresas) e INTERNI MATERIAE.")
    bullet(doc, "Notas de prensa y materiales trilingües (español, italiano, inglés) para medios italianos y red "
                "diplomática; interlocución con ANIEME, ASCER y empresas.")
    bullet(doc, "Inteligencia de mercado sobre cambios regulatorios relevantes para el exportador español: "
                "Transizione 5.0, PNRR, licitaciones públicas y Milano-Cortina 2026.")

    role(doc, "Financial & Business Controller", "Jul. 2025 – Oct. 2025",
         "KPMG  ·  Madrid, España")
    bullet(doc, "Control y análisis de más de 1.000 proyectos: rentabilidad, márgenes, desviaciones y reporting "
                "estratégico al CFO.")
    bullet(doc, "+30 % de eficiencia en reporting mediante el rediseño de la interfaz de carga de datos en CRM.")

    role(doc, "Controller de Programas Comerciales", "Mar. 2024 – Abr. 2025",
         "Airbus Helicopters España  ·  Albacete, España")
    bullet(doc, "Negociación con proveedores internacionales en contratos de navalización, con mejora de márgenes.")
    bullet(doc, "Programa H135, el más rentable de la compañía en 2024: KPIs estratégicos, plazos de entrega a "
                "cliente y control de calidad.")
    bullet(doc, "Cierres mensuales, seguimiento de riesgos y oportunidades y reporting financiero al CFO.")

    role(doc, "Prácticas en Gerencia de Urbanismo", "2023 – 2024",
         "Ayuntamiento de Móstoles  ·  Móstoles, España")
    bullet(doc, "Preparación de auditorías públicas, gestión de facturación y mejora de procesos administrativos.")

    section(doc, "Proyecto propio")
    role(doc, "Hazte con Todos — producto digital lanzado en solitario", "2026",
         "Proyecto personal  ·  Cloudflare Pages + D1")
    bullet(doc, "Web propia llevada de la idea al lanzamiento en solitario: +180.000 visitas en dos semanas y "
                "~151.000 partidas registradas, con crecimiento 100 % orgánico y presupuesto de marketing cero.")
    bullet(doc, "Aplicación práctica de marketing digital, analítica de tráfico e IA (Claude Code) trasladable a "
                "la promoción internacional y a la captación digital de leads.")

    formacion_es(doc)

    section(doc, "Competencias")
    skill_line(doc, "Comercio exterior",
               "Incoterms 2020, medios de pago internacionales, contratación internacional, due diligence "
               "comercial, prospección de distribuidores e importadores.")
    skill_line(doc, "Estudios de mercado",
               "fichas de sector ICEX, inteligencia competitiva, fuentes oficiales (Eurostat, ISTAT, INE, TARIC), "
               "bases de datos comerciales.")
    skill_line(doc, "Promoción y ferias",
               "organización de misiones y pabellones, agendas comerciales, seguimiento post-feria, "
               "comunicación institucional trilingüe.")
    skill_line(doc, "Gestión y análisis",
               "KPIs, control de presupuesto de acciones, reporting a dirección, metodologías ágiles.")
    skill_line(doc, "Herramientas",
               "Excel avanzado, Power BI, Power Automate, SAP, CRM; IA aplicada (Claude, ChatGPT) a análisis y "
               "productividad.")

    idiomas_es(doc)
    doc.save(os.path.join(OUT, "CV_JuanBenitez_3_ComercioExterior.docx"))


# ================================================================= CV 4 — INSTITUCIONES

def cv_instituciones():
    doc = new_doc()
    header_block(doc, NAME,
                 "Diplomacia Económica  ·  Relaciones Institucionales y Asuntos Públicos  ·  Política Comercial UE",
                 CONTACT_ES)

    section(doc, "Perfil")
    body(doc, "Economista y politólogo con experiencia directa en la red exterior del Estado español, actualmente "
              "en la Oficina Económica y Comercial de España en Milán (ICEX). Combino la formación dual en "
              "economía y ciencia política de la Universidad Rey Juan Carlos, la formación diplomática de la "
              "Escuela Diplomática del MAEC y una trayectoria académica propia en seguridad internacional en el "
              "Indo-Pacífico, con ponencia en congreso y capítulo en publicación. Vocación de servicio público y "
              "foco en promoción exterior, política comercial europea y organismos multilaterales. "
              "Trilingüe español–inglés–italiano.")

    section(doc, "Logros destacados")
    bullet(doc, "acompañamiento a la CEO de ICEX, Elisa Carbonell, durante la Milano Design Week 2026.",
           bold_lead="Representación institucional de alto nivel: ")
    bullet(doc, "de la Asociación de Política Exterior Española (APEE) y capítulo en publicación en Editorial "
                "Ramón Areces.",
           bold_lead="Ponente en el II Congreso ")
    bullet(doc, "(español, italiano, inglés) para medios italianos y red diplomática en EMEA.",
           bold_lead="Redacción de notas de prensa y materiales trilingües ")
    bullet(doc, "PNRR italiano, Transizione 5.0, política industrial y comercial de la UE.",
           bold_lead="Seguimiento de marcos de política pública: ")

    section(doc, "Experiencia institucional y profesional")

    role(doc, "Técnico de Comercio Exterior", "Ene. 2026 – Actualidad",
         "Oficina Económica y Comercial de España en Milán (ICEX · Misión Diplomática)  ·  Milán, Italia")
    bullet(doc, "Apoyo institucional al Consejero Económico y Comercial Jefe en la atención a empresas españolas, "
                "la coordinación con asociaciones sectoriales y la representación de España en eventos en el "
                "norte de Italia.")
    bullet(doc, "Visitas institucionales de alto nivel: acompañamiento a la CEO de ICEX, Elisa Carbonell, durante "
                "la Milano Design Week 2026 (Tile of Spain, APPARTAMENTO SPAGNOLO, INTERNI MATERIAE en la "
                "Università degli Studi di Milano).")
    bullet(doc, "Notas de prensa y materiales bilingües y trilingües para difusión a medios italianos y a la red "
                "diplomática: embajada, consulados y otras Oficinas Económicas y Comerciales de la región EMEA.")
    bullet(doc, "Inteligencia regulatoria sobre marcos relevantes para España: PNRR italiano, Transizione 5.0, "
                "política industrial de la UE, política comercial común y Milano-Cortina 2026.")
    bullet(doc, "Estudios de mercado y fichas sectoriales conforme a metodología oficial ICEX, con verificación "
                "cruzada de fuentes (INE, ISTAT, Eurostat, TARIC).")
    bullet(doc, "Elaboración de la documentación protocolaria interna «Who is Who» de contactos institucionales y "
                "empresariales para el equipo directivo de la oficina.")

    role(doc, "Financial & Business Controller", "Jul. 2025 – Oct. 2025",
         "KPMG  ·  Madrid, España")
    bullet(doc, "Análisis de rentabilidad de más de 1.000 proyectos y reporting estratégico al CFO en una Big Four.")
    bullet(doc, "Automatización de procesos de reporting, con +30 % de eficiencia operativa.")

    role(doc, "Controller de Programas Comerciales", "Mar. 2024 – Abr. 2025",
         "Airbus Helicopters España  ·  Albacete, España")
    bullet(doc, "Programa H135, el más rentable de la compañía en 2024: gestión de KPIs, plazos y calidad en "
                "proyectos aeroespaciales internacionales.")
    bullet(doc, "Negociación con proveedores internacionales y reporting financiero directo al CFO.")

    role(doc, "Prácticas en Gerencia de Urbanismo", "2023 – 2024",
         "Ayuntamiento de Móstoles  ·  Móstoles, España")
    bullet(doc, "Apoyo a auditorías públicas, gestión de facturación y procedimiento administrativo en la "
                "administración local.")

    section(doc, "Ponencias y publicaciones")
    role(doc, "Ponente — II Congreso de la Asociación de Política Exterior Española", "2025",
         "Fundación Ramón Areces / APEE  ·  Madrid, España")
    bullet(doc, "«Equilibrio Estratégico de la ASEAN en la Guerra Fría Tecnológica: Implicaciones para el Sudeste "
                "Asiático», en la mesa dedicada al Indo-Pacífico Sudeste.")
    bullet(doc, "Capítulo derivado de la ponencia, en publicación en libro colectivo de Editorial Ramón Areces.")

    formacion_es(doc)

    section(doc, "Áreas de conocimiento")
    skill_line(doc, "Diplomacia económica e instituciones",
               "Red Exterior de Comercio del Estado (TCEE / DCE), embajadas y consulados, cámaras bilaterales, "
               "asociaciones sectoriales españolas, organismos multilaterales (BID, ADB).")
    skill_line(doc, "Política exterior y seguridad internacional",
               "dinámicas estratégicas del Indo-Pacífico, ASEAN, competición tecnológica entre grandes potencias, "
               "análisis de riesgo geopolítico.")
    skill_line(doc, "Comercio exterior y política comercial",
               "instrumentos de promoción exterior, política comercial común de la UE, acuerdos comerciales "
               "internacionales, instrumentos ICEX.")
    skill_line(doc, "Análisis y redacción",
               "metodología ICEX, fuentes oficiales (Eurostat, ISTAT, INE, TARIC, OCDE), informes técnicos, "
               "notas de prensa y materiales institucionales.")
    skill_line(doc, "Gestión pública",
               "auditoría, contratación, procedimiento administrativo y cooperación interinstitucional.")

    idiomas_es(doc)
    doc.save(os.path.join(OUT, "CV_JuanBenitez_4_Instituciones.docx"))


# ================================================================= CV 5 — DIGITAL / PRODUCTO / GROWTH

def cv_digital():
    doc = new_doc()
    header_block(doc, NAME,
                 "Producto Digital y Growth  ·  Datos y Automatización con IA  ·  Negocio Internacional",
                 CONTACT_ES)

    section(doc, "Perfil")
    body(doc, "Economista que construye y lanza producto digital. En 2026 llevé en solitario una web de la idea a "
              "+180.000 visitas en dos semanas y ~151.000 partidas registradas, con presupuesto de marketing cero "
              "y crecimiento puramente orgánico. Ese perfil de producto se apoya en una base poco habitual: "
              "control de gestión en Airbus Helicopters y KPMG (rentabilidad, KPIs, reporting a CFO) y desarrollo "
              "de negocio internacional en la red exterior del Estado. Uso IA de forma avanzada como herramienta "
              "de ejecución diaria, no como discurso.")

    section(doc, "Logros destacados")
    bullet(doc, "en dos semanas y ~15.000 partidas completadas al día, con 0 € de inversión en captación.",
           bold_lead="+180.000 visitas ")
    bullet(doc, "diseñada a propósito: la tarjeta de resultado que el propio usuario comparte.",
           bold_lead="Crecimiento 100 % orgánico mediante una mecánica de compartición ")
    bullet(doc, "en el ciclo de reporting de KPMG mediante el rediseño del proceso de carga de datos en CRM.",
           bold_lead="+30 % de eficiencia ")
    bullet(doc, "con seguimiento de KPIs, márgenes y forecast en el programa más rentable de Airbus Helicopters "
                "España en 2024.",
           bold_lead="Gestión de datos de negocio ")

    section(doc, "Proyecto propio")
    role(doc, "Hazte con Todos — creador y desarrollador único", "2026 – Actualidad",
         "Proyecto personal  ·  Cloudflare Pages + D1")
    body(doc, "Simulador web de carrera profesional: el usuario toma decisiones encadenadas y obtiene una "
              "puntuación de legado, un rango, una tarjeta compartible y un puesto en el Top 100. "
              "Web estática (HTML/JS) sobre Cloudflare Pages con base de datos D1. Gratuito y sin publicidad.",
         space_after=3)
    bullet(doc, "Tracción: +180.000 visitas en dos semanas, picos de 20.000 visitas/día, ~15.000 partidas "
                "completadas al día y ~151.000 partidas registradas en base de datos.")
    bullet(doc, "Producto de extremo a extremo en solitario: concepto, diseño de la mecánica, contenido, "
                "front-end, modelo de datos, despliegue e infraestructura.")
    bullet(doc, "Adquisición sin presupuesto: el bucle de crecimiento está en el propio producto —una tarjeta PNG "
                "generada al terminar que el usuario comparte en redes— en lugar de en pago por clic.")
    bullet(doc, "Infraestructura: Cloudflare Pages + D1, despliegue continuo desde Git, escalado sin incidencias "
                "durante los picos de tráfico y coste operativo cercano a cero.")
    bullet(doc, "Ritmo de ejecución con IA: iteración diaria del producto con Claude Code, de la idea a la escala "
                "real en semanas.")

    section(doc, "Experiencia profesional")

    role(doc, "Técnico de Comercio Exterior", "Ene. 2026 – Actualidad",
         "Oficina Económica y Comercial de España en Milán (ICEX)  ·  Milán, Italia")
    bullet(doc, "Análisis de mercado y de competencia para empresas españolas en Italia: demanda, canales, "
                "precios y barreras, con verificación cruzada de fuentes (Eurostat, ISTAT, INE, TARIC).")
    bullet(doc, "Informes ejecutivos y visualización de datos para comités de decisión; producción de contenidos "
                "y materiales trilingües para difusión externa.")
    bullet(doc, "Coordinación de proyectos y eventos con múltiples stakeholders: 4 instalaciones y más de 15 "
                "empresas en Milano Design Week 2026.")

    role(doc, "Financial & Business Controller", "Jul. 2025 – Oct. 2025",
         "KPMG  ·  Madrid, España")
    bullet(doc, "Análisis de rentabilidad y márgenes de más de 1.000 proyectos, con reporting al CFO.")
    bullet(doc, "Rediseño del proceso y la interfaz de carga de datos en CRM: +30 % de eficiencia en reporting.")

    role(doc, "Controller de Programas Comerciales", "Mar. 2024 – Abr. 2025",
         "Airbus Helicopters España  ·  Albacete, España")
    bullet(doc, "Programa H135, el más rentable de la compañía en 2024: KPIs, plazos de entrega, calidad y "
                "seguimiento del business case.")
    bullet(doc, "Cierres mensuales, forecasting y análisis de riesgos y oportunidades; negociación con "
                "proveedores internacionales.")

    formacion_es(doc, master=True, diplo=False)

    section(doc, "Competencias")
    skill_line(doc, "Producto y growth",
               "definición de producto, mecánicas de retención y compartición, analítica de uso, iteración rápida, "
               "lanzamiento sin presupuesto.")
    skill_line(doc, "Datos",
               "Excel avanzado, Power BI, SQL, modelado de datos, KPIs de negocio, reporting a dirección.")
    skill_line(doc, "Técnico",
               "HTML/CSS/JavaScript, Cloudflare Pages y D1, Git y despliegue continuo, PWA, nociones de SEO y "
               "analítica web.")
    skill_line(doc, "IA aplicada",
               "Claude Code y ChatGPT como herramienta de desarrollo, análisis y automatización de procesos; "
               "Power Automate.")
    skill_line(doc, "Negocio",
               "desarrollo de negocio internacional, análisis de mercado, gestión de stakeholders, metodologías "
               "ágiles (Máster en Metodologías Ágiles y Transformación Digital).")

    idiomas_es(doc)
    doc.save(os.path.join(OUT, "CV_JuanBenitez_5_DigitalProducto.docx"))


# ================================================================= CV 6 — ENGLISH

def cv_english():
    doc = new_doc()
    header_block(doc, NAME,
                 "International Business Development  ·  Market Entry & Trade  ·  Southern Europe / EMEA",
                 CONTACT_EN)

    section(doc, "Profile")
    body(doc, "Economist working at the intersection of international business development, trade and programme "
              "management. Currently at the Spanish Trade and Investment Office in Milan (ICEX), helping Spanish "
              "companies enter and scale in the Italian market. Previously at Airbus Helicopters, on the H135 — "
              "the company's most profitable programme in 2024 — and at KPMG, analysing profitability across "
              "1,000+ projects with direct CFO reporting. Trilingual (Spanish, English, Italian) with an "
              "established institutional and commercial network in Italy.")

    section(doc, "Selected achievements")
    bullet(doc, "the company's most profitable programme in 2024, including negotiation with international suppliers.",
           bold_lead="Airbus Helicopters H135 programme: ")
    bullet(doc, "and a 30 % efficiency gain in the reporting cycle, reporting directly to the CFO.",
           bold_lead="1,000+ projects analysed at KPMG ")
    bullet(doc, "4 installations, 15+ companies and a high-level visit by the CEO of ICEX.",
           bold_lead="Led Spain's institutional presence at Milano Design Week 2026: ")
    bullet(doc, "180,000+ visits in two weeks with zero marketing spend.",
           bold_lead="Built and launched a digital product solo: ")

    section(doc, "Professional experience")

    role(doc, "International Trade Officer", "Jan. 2026 – Present",
         "Spanish Trade and Investment Office in Milan (ICEX)  ·  Milan, Italy")
    bullet(doc, "Identify and qualify market opportunities for Spanish companies in Italy: demand analysis, "
                "competitive mapping, route-to-market assessment and selection of local partners (distributors, "
                "agents, importers).")
    bullet(doc, "Regulatory and tender intelligence on Italy's major investment frameworks: NRRP (€125 bn), "
                "Transizione 5.0 and infrastructure programmes linked to the Milano-Cortina 2026 Olympics.")
    bullet(doc, "Sector studies and business intelligence with cross-verified official sources (Eurostat, ISTAT, "
                "INE, TARIC), delivered as executive reports to company decision-makers.")
    bullet(doc, "Senior stakeholder management: Spanish trade associations (ASCER, ANIEME), Italian industry "
                "bodies, the Embassy, bilateral chambers of commerce and Spanish subsidiaries in Italy.")
    bullet(doc, "Cross-functional coordination of Spain's institutional presence at Milano Design Week 2026: "
                "4 installations, 15+ companies, hosting the visit of the CEO of ICEX.")
    bullet(doc, "Coverage of international trade fairs (Cosmoprof Bologna, Salone del Mobile, Pitti Uomo): "
                "24+ exhibitor meetings, market intelligence gathering and post-fair commercial follow-up.")

    role(doc, "Financial & Business Controller", "Jul. 2025 – Oct. 2025",
         "KPMG  ·  Madrid, Spain")
    bullet(doc, "Profitability and margin analysis across 1,000+ firm projects, identifying improvement levers "
                "and reporting directly to the CFO.")
    bullet(doc, "Redesigned the CRM data-entry process and interface for project managers: 30 % efficiency gain "
                "in the reporting cycle.")

    role(doc, "Commercial Programmes Controller", "Mar. 2024 – Apr. 2025",
         "Airbus Helicopters Spain  ·  Albacete, Spain")
    bullet(doc, "H135 programme — the company's most profitable in 2024: cross-functional management of strategic "
                "KPIs, customer delivery schedules and quality assurance in a regulated aerospace environment.")
    bullet(doc, "Negotiated with international suppliers on navalisation contracts, improving programme margins "
                "through renegotiated commercial terms and technical specifications.")
    bullet(doc, "Owned the programme business case: monthly closings, forecasting, risk and opportunity tracking "
                "and financial reporting to the CFO.")

    role(doc, "Intern, Urban Planning Department", "2023 – 2024",
         "Móstoles City Council  ·  Móstoles, Spain")
    bullet(doc, "Supported public audits, invoicing and data-driven improvement of administrative processes.")

    section(doc, "Side project")
    role(doc, "Hazte con Todos — solo-built digital product", "2026",
         "Cloudflare Pages + D1")
    bullet(doc, "Web product built end to end alone (product design, development, data model and infrastructure) "
                "and launched with no marketing budget.")
    bullet(doc, "180,000+ visits in two weeks, ~15,000 completed sessions per day and ~151,000 records in the "
                "database; growth driven entirely by an in-product viral sharing mechanic.")
    bullet(doc, "Built with advanced use of AI tooling (Claude Code): idea to real-world scale in weeks, at "
                "near-zero operating cost.")

    section(doc, "Education")
    edu(doc, "5th International Trade Officers Programme", "Sept. 2025 – Dec. 2026",
        "Madrid Chamber of Commerce · Regional Government of Madrid",
        "Highly selective: 20 places nationwide within the ICEX network. 300 hours covering international payment "
        "methods, Incoterms 2020, international taxation, cross-cultural negotiation and international marketing.")
    edu(doc, "Double Degree in Economics and Political Science", "2019 – 2024",
        "Universidad Rey Juan Carlos, Madrid")
    edu(doc, "MSc in Agile Methodologies and Digital Transformation", "2024 – 2025",
        "Universidad Camilo José Cela, Madrid")
    edu(doc, "Course in Foreign Policy and Development Cooperation", "June 2025",
        "Diplomatic School of Spain (Ministry of Foreign Affairs)")
    body(doc, "Further training: Certificate in Business Internationalisation (ICEX) · Building Networks for a "
              "Eurasian Community · IT, AI and Capital Flows (Asian Development Bank Institute).",
         size=9.3, color=GREY, space_after=1)

    section(doc, "Skills")
    skill_line(doc, "Business development",
               "opportunity identification and qualification, business cases, market entry strategy, competitor "
               "and partner mapping, international negotiation.")
    skill_line(doc, "Market intelligence",
               "ICEX methodology, official sources (Eurostat, ISTAT, INE, TARIC, OECD), regulatory and public "
               "tender monitoring (NRRP, EU funds).")
    skill_line(doc, "Financial analysis",
               "advanced Excel, KPIs, profitability analysis, forecasting and senior-management reporting.")
    skill_line(doc, "Industries",
               "aerospace and defence, industrial goods, energy, consumer goods (home, ceramics, fashion, "
               "cosmetics), professional services.")
    skill_line(doc, "Tools",
               "Advanced Excel, Power BI, Power Automate, SAP, CRM, basic SQL; advanced applied AI (Claude, "
               "ChatGPT) for analysis and automation.")

    section(doc, "Languages")
    body(doc, LANGS_EN)
    doc.save(os.path.join(OUT, "CV_JuanBenitez_6_InternationalBD_EN.docx"))


if __name__ == "__main__":
    cv_bd()
    cv_defensa()
    cv_comex()
    cv_instituciones()
    cv_digital()
    cv_english()
    print("OK:", sorted(os.listdir(OUT)))
