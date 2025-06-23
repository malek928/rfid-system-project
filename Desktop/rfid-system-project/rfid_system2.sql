--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-05-13 18:47:42

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 16899)
-- Name: rfid_system; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA rfid_system;


ALTER SCHEMA rfid_system OWNER TO postgres;

--
-- TOC entry 241 (class 1255 OID 16943)
-- Name: generate_jean_id(); Type: FUNCTION; Schema: rfid_system; Owner: postgres
--

CREATE FUNCTION rfid_system.generate_jean_id() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN 'JEAN' || LPAD(nextval('rfid_system.jean_id_seq')::TEXT, 3, '0');
END;
$$;


ALTER FUNCTION rfid_system.generate_jean_id() OWNER TO postgres;

--
-- TOC entry 240 (class 1255 OID 16940)
-- Name: generate_lot_id(); Type: FUNCTION; Schema: rfid_system; Owner: postgres
--

CREATE FUNCTION rfid_system.generate_lot_id() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN 'LOT' || LPAD(nextval('rfid_system.lot_id_seq')::TEXT, 3, '0');
END;
$$;


ALTER FUNCTION rfid_system.generate_lot_id() OWNER TO postgres;

--
-- TOC entry 239 (class 1255 OID 16924)
-- Name: update_quantite_initiale(); Type: FUNCTION; Schema: rfid_system; Owner: postgres
--

CREATE FUNCTION rfid_system.update_quantite_initiale() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE lots
  SET quantite_initiale = (SELECT COUNT(*) FROM jeans WHERE lot_id = NEW.lot_id)
  WHERE lot_id = NEW.lot_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION rfid_system.update_quantite_initiale() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 16598)
-- Name: assignations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignations (
    assignation_id character varying(20) NOT NULL,
    lot_id character varying(10) NOT NULL,
    utilisateur_id character varying(10) NOT NULL,
    description text,
    quantite_a_traiter integer NOT NULL,
    quantite_terminee integer DEFAULT 0,
    lot_a_traiter integer NOT NULL,
    lot_termine integer DEFAULT 0,
    statut character varying(20) DEFAULT 'en cours'::character varying
);


ALTER TABLE public.assignations OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16695)
-- Name: rfid_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rfid_tags (
    id integer NOT NULL,
    epc character varying(255) NOT NULL,
    tid character varying(255),
    user_data character varying(255),
    "timestamp" timestamp with time zone NOT NULL
);


ALTER TABLE public.rfid_tags OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16694)
-- Name: rfid_tags_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rfid_tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rfid_tags_id_seq OWNER TO postgres;

--
-- TOC entry 5039 (class 0 OID 0)
-- Dependencies: 222
-- Name: rfid_tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rfid_tags_id_seq OWNED BY public.rfid_tags.id;


--
-- TOC entry 221 (class 1259 OID 16624)
-- Name: chaines; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.chaines (
    chaine_id character varying(10) NOT NULL,
    nom_chaine character varying(50) NOT NULL
);


ALTER TABLE rfid_system.chaines OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16704)
-- Name: controle_qualite; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.controle_qualite (
    control_id integer NOT NULL,
    jean_id character varying(50),
    lot_id character varying(50),
    date_controle timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resultat character varying(50) NOT NULL,
    raison_defaut character varying(255),
    responsable_id character varying NOT NULL
);


ALTER TABLE rfid_system.controle_qualite OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16703)
-- Name: controle_qualite_control_id_seq; Type: SEQUENCE; Schema: rfid_system; Owner: postgres
--

CREATE SEQUENCE rfid_system.controle_qualite_control_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE rfid_system.controle_qualite_control_id_seq OWNER TO postgres;

--
-- TOC entry 5040 (class 0 OID 0)
-- Dependencies: 224
-- Name: controle_qualite_control_id_seq; Type: SEQUENCE OWNED BY; Schema: rfid_system; Owner: postgres
--

ALTER SEQUENCE rfid_system.controle_qualite_control_id_seq OWNED BY rfid_system.controle_qualite.control_id;


--
-- TOC entry 234 (class 1259 OID 16942)
-- Name: jean_id_seq; Type: SEQUENCE; Schema: rfid_system; Owner: postgres
--

CREATE SEQUENCE rfid_system.jean_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE rfid_system.jean_id_seq OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16747)
-- Name: jeans; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.jeans (
    jean_id character varying(50) DEFAULT rfid_system.generate_jean_id() NOT NULL,
    epc character varying(50) NOT NULL,
    lot_id character varying(50),
    statut_qualite character varying(50) DEFAULT 'non v‚rifi‚'::character varying,
    localisation character varying(255),
    ouvrier_id text,
    statut character varying(50) DEFAULT 'non verifie'::character varying,
    ouvrier_nom text,
    chaine_id text
);


ALTER TABLE rfid_system.jeans OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16926)
-- Name: jeans_backup; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.jeans_backup (
    jean_id character varying(50),
    epc character varying(50),
    lot_id character varying(50),
    statut_qualite character varying(50),
    localisation character varying(255),
    ouvrier_id text,
    statut character varying(50),
    ouvrier_nom text
);


ALTER TABLE rfid_system.jeans_backup OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 17600)
-- Name: jeans_history; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.jeans_history (
    history_id integer NOT NULL,
    jean_id character varying(50) NOT NULL,
    epc character varying(50) NOT NULL,
    lot_id character varying(50) NOT NULL,
    statut_qualite character varying(50),
    localisation character varying(100),
    ouvrier_id character varying(50),
    ouvrier_nom character varying(100),
    chaine_id character varying(50),
    date_expedition timestamp with time zone
);


ALTER TABLE rfid_system.jeans_history OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 17599)
-- Name: jeans_history_history_id_seq; Type: SEQUENCE; Schema: rfid_system; Owner: postgres
--

CREATE SEQUENCE rfid_system.jeans_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE rfid_system.jeans_history_history_id_seq OWNER TO postgres;

--
-- TOC entry 5041 (class 0 OID 0)
-- Dependencies: 237
-- Name: jeans_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: rfid_system; Owner: postgres
--

ALTER SEQUENCE rfid_system.jeans_history_history_id_seq OWNED BY rfid_system.jeans_history.history_id;


--
-- TOC entry 236 (class 1259 OID 16960)
-- Name: lot_history; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.lot_history (
    history_id integer NOT NULL,
    lot_id character varying(50) NOT NULL,
    couleur character varying(50),
    taille character varying(50),
    ouvrier_nom character varying(100),
    temps_debut_travail timestamp without time zone,
    temps_fin timestamp without time zone,
    statut character varying(20),
    machine character varying(100),
    quantite_initiale integer,
    jeans_defectueux integer,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    quantite_finale integer DEFAULT 0,
    temps_debut timestamp without time zone,
    operateur_nom character varying(255),
    date_expedition timestamp without time zone
);


ALTER TABLE rfid_system.lot_history OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16959)
-- Name: lot_history_history_id_seq; Type: SEQUENCE; Schema: rfid_system; Owner: postgres
--

CREATE SEQUENCE rfid_system.lot_history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE rfid_system.lot_history_history_id_seq OWNER TO postgres;

--
-- TOC entry 5042 (class 0 OID 0)
-- Dependencies: 235
-- Name: lot_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: rfid_system; Owner: postgres
--

ALTER SEQUENCE rfid_system.lot_history_history_id_seq OWNED BY rfid_system.lot_history.history_id;


--
-- TOC entry 233 (class 1259 OID 16939)
-- Name: lot_id_seq; Type: SEQUENCE; Schema: rfid_system; Owner: postgres
--

CREATE SEQUENCE rfid_system.lot_id_seq
    START WITH 9
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE rfid_system.lot_id_seq OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16821)
-- Name: lots; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.lots (
    lot_id character varying(50) DEFAULT rfid_system.generate_lot_id() NOT NULL,
    epc character varying(50),
    taille character varying(50),
    couleur character varying(50),
    quantite_initiale integer DEFAULT 0,
    jeans_defectueux integer DEFAULT 0,
    quantite_finale integer,
    temps_debut timestamp without time zone,
    temps_debut_travail timestamp without time zone,
    temps_fin timestamp without time zone,
    statut character varying(50) DEFAULT 'en attente'::character varying,
    chaine_id character varying(50),
    localisation character varying(50),
    ouvrier_nom text,
    operateur_id character varying(50)
);


ALTER TABLE rfid_system.lots OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16804)
-- Name: machines; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.machines (
    machine_id integer NOT NULL,
    nom_machine character varying(50) NOT NULL,
    est_disponible boolean DEFAULT true,
    chaine_id character varying(50),
    ouvrier_id character varying(10)
);


ALTER TABLE rfid_system.machines OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16803)
-- Name: machines_machine_id_seq; Type: SEQUENCE; Schema: rfid_system; Owner: postgres
--

CREATE SEQUENCE rfid_system.machines_machine_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE rfid_system.machines_machine_id_seq OWNER TO postgres;

--
-- TOC entry 5043 (class 0 OID 0)
-- Dependencies: 227
-- Name: machines_machine_id_seq; Type: SEQUENCE OWNED BY; Schema: rfid_system; Owner: postgres
--

ALTER SEQUENCE rfid_system.machines_machine_id_seq OWNED BY rfid_system.machines.machine_id;


--
-- TOC entry 231 (class 1259 OID 16864)
-- Name: ouvriers; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.ouvriers (
    ouvrier_id text NOT NULL,
    nom text NOT NULL,
    prenom text,
    telephone text,
    chaine_id text NOT NULL,
    is_active boolean DEFAULT true,
    localisation character varying(100)
);


ALTER TABLE rfid_system.ouvriers OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16405)
-- Name: roles; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.roles (
    role_id integer NOT NULL,
    nom_role character varying(50) NOT NULL
);


ALTER TABLE rfid_system.roles OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16408)
-- Name: roles_roleid_seq; Type: SEQUENCE; Schema: rfid_system; Owner: postgres
--

CREATE SEQUENCE rfid_system.roles_roleid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE rfid_system.roles_roleid_seq OWNER TO postgres;

--
-- TOC entry 5044 (class 0 OID 0)
-- Dependencies: 219
-- Name: roles_roleid_seq; Type: SEQUENCE OWNED BY; Schema: rfid_system; Owner: postgres
--

ALTER SEQUENCE rfid_system.roles_roleid_seq OWNED BY rfid_system.roles.role_id;


--
-- TOC entry 230 (class 1259 OID 16841)
-- Name: utilisateurs; Type: TABLE; Schema: rfid_system; Owner: postgres
--

CREATE TABLE rfid_system.utilisateurs (
    utilisateur_id character varying(50) NOT NULL,
    nom character varying(50) NOT NULL,
    prenom character varying(50) NOT NULL,
    date_inscription timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role_id integer,
    email character varying(100) NOT NULL,
    telephone character varying(20),
    is_active boolean DEFAULT true,
    chaine_id character varying(50),
    password character varying(255),
    CONSTRAINT check_chaine_id_by_role CHECK ((((role_id = 3) AND (chaine_id IS NULL)) OR ((role_id = ANY (ARRAY[1, 2])) AND (chaine_id IS NOT NULL)))),
    CONSTRAINT check_role_id_for_active CHECK (((is_active = false) OR (role_id IS NOT NULL)))
);


ALTER TABLE rfid_system.utilisateurs OWNER TO postgres;

--
-- TOC entry 4805 (class 2604 OID 16698)
-- Name: rfid_tags id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfid_tags ALTER COLUMN id SET DEFAULT nextval('public.rfid_tags_id_seq'::regclass);


--
-- TOC entry 4806 (class 2604 OID 16707)
-- Name: controle_qualite control_id; Type: DEFAULT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.controle_qualite ALTER COLUMN control_id SET DEFAULT nextval('rfid_system.controle_qualite_control_id_seq'::regclass);


--
-- TOC entry 4823 (class 2604 OID 17603)
-- Name: jeans_history history_id; Type: DEFAULT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.jeans_history ALTER COLUMN history_id SET DEFAULT nextval('rfid_system.jeans_history_history_id_seq'::regclass);


--
-- TOC entry 4820 (class 2604 OID 16963)
-- Name: lot_history history_id; Type: DEFAULT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.lot_history ALTER COLUMN history_id SET DEFAULT nextval('rfid_system.lot_history_history_id_seq'::regclass);


--
-- TOC entry 4811 (class 2604 OID 16807)
-- Name: machines machine_id; Type: DEFAULT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.machines ALTER COLUMN machine_id SET DEFAULT nextval('rfid_system.machines_machine_id_seq'::regclass);


--
-- TOC entry 4801 (class 2604 OID 16418)
-- Name: roles role_id; Type: DEFAULT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.roles ALTER COLUMN role_id SET DEFAULT nextval('rfid_system.roles_roleid_seq'::regclass);


--
-- TOC entry 5015 (class 0 OID 16598)
-- Dependencies: 220
-- Data for Name: assignations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assignations (assignation_id, lot_id, utilisateur_id, description, quantite_a_traiter, quantite_terminee, lot_a_traiter, lot_termine, statut) FROM stdin;
\.


--
-- TOC entry 5018 (class 0 OID 16695)
-- Dependencies: 223
-- Data for Name: rfid_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rfid_tags (id, epc, tid, user_data, "timestamp") FROM stdin;
\.


--
-- TOC entry 5016 (class 0 OID 16624)
-- Dependencies: 221
-- Data for Name: chaines; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.chaines (chaine_id, nom_chaine) FROM stdin;
CH001	Chaine 1
CH002	Chaine 2
\.


--
-- TOC entry 5020 (class 0 OID 16704)
-- Dependencies: 225
-- Data for Name: controle_qualite; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.controle_qualite (control_id, jean_id, lot_id, date_controle, resultat, raison_defaut, responsable_id) FROM stdin;
29	JEAN055	LOT021	2025-05-11 00:00:00	défectueux	button	USER011
30	JEAN125	LOT058	2025-05-13 00:00:00	défectueux	bu	USER011
31	JEAN132	LOT062	2025-05-13 00:00:00	défectueux	blue	USER011
\.


--
-- TOC entry 5021 (class 0 OID 16747)
-- Dependencies: 226
-- Data for Name: jeans; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.jeans (jean_id, epc, lot_id, statut_qualite, localisation, ouvrier_id, statut, ouvrier_nom, chaine_id) FROM stdin;
\.


--
-- TOC entry 5027 (class 0 OID 16926)
-- Dependencies: 232
-- Data for Name: jeans_backup; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.jeans_backup (jean_id, epc, lot_id, statut_qualite, localisation, ouvrier_id, statut, ouvrier_nom) FROM stdin;
JEAN007	JEAN_EPC007	LOT001	non verifie	\N	\N	non verifie	\N
JEAN003	JEAN_EPC003	LOT002	non verifie	\N	\N	en attente	\N
JEAN002	JEAN_EPC002	LOT001	non verifie	\N	\N	en attente	\N
JEAN001	JEAN_EPC001	LOT001	non verifie	\N	\N	en attente	\N
JEAN004	JEAN_EPC004	LOT001	non verifie	\N	\N	non verifie	\N
JEAN005	JEAN_EPC005	LOT002	non verifie	\N	\N	non verifie	\N
JEAN006	JEAN_EPC006	LOT002	non verifie	\N	\N	non verifie	\N
\.


--
-- TOC entry 5033 (class 0 OID 17600)
-- Dependencies: 238
-- Data for Name: jeans_history; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.jeans_history (history_id, jean_id, epc, lot_id, statut_qualite, localisation, ouvrier_id, ouvrier_nom, chaine_id, date_expedition) FROM stdin;
1	JEAN131	5	LOT061	non vérifié	Chaine 1, Machine 1	\N	sophie ben said	CH001	2025-05-13 17:07:14.087606+01
2	JEAN133	2	LOT062	non vérifié	Chaine 1, Machine 3	\N	OuvrierA Mohammed	CH001	2025-05-13 17:09:10.273741+01
3	JEAN132	1	LOT062	défectueux	Chaine 1, Machine 3	\N	OuvrierA Mohammed	CH001	2025-05-13 17:09:10.273741+01
4	JEAN133	2	LOT062	non vérifié	Chaine 1, Machine 3	\N	OuvrierA Mohammed	CH001	2025-05-13 17:09:24.897483+01
5	JEAN132	1	LOT062	défectueux	Chaine 1, Machine 3	\N	OuvrierA Mohammed	CH001	2025-05-13 17:09:24.897483+01
\.


--
-- TOC entry 5031 (class 0 OID 16960)
-- Dependencies: 236
-- Data for Name: lot_history; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.lot_history (history_id, lot_id, couleur, taille, ouvrier_nom, temps_debut_travail, temps_fin, statut, machine, quantite_initiale, jeans_defectueux, recorded_at, quantite_finale, temps_debut, operateur_nom, date_expedition) FROM stdin;
21	LOT056	b	L	OuvrierA Mohammed	2025-05-13 12:09:55.915	2025-05-13 13:12:58.001	expédié	Chaine 1, Machine 3	2	0	2025-05-13 14:12:58.035959	2	2025-05-13 13:09:30.722	OuvrierA Mohammed	2025-05-13 15:03:18.653057
23	LOT058	s	q	sophie ben said	2025-05-13 13:24:11.613	2025-05-13 14:31:11.218	expédié	Chaine 1, Machine 1	2	1	2025-05-13 15:31:11.227273	1	2025-05-13 14:04:13.785	sophie ben said	2025-05-13 16:08:40.375653
22	LOT057	b	L	OuvrierA Mohammed	2025-05-13 13:05:10.948	2025-05-13 14:29:58.328	expédié	Chaine 1, Machine 3	2	0	2025-05-13 15:29:58.372131	2	2025-05-13 14:03:51.983	OuvrierA Mohammed	2025-05-13 16:08:49.734114
24	LOT059	b	L	sophie ben said	2025-05-13 14:46:55.948	2025-05-13 15:47:15.817	expédié	Chaine 1, Machine 1	2	0	2025-05-13 16:47:15.917047	2	2025-05-13 14:04:30.131	sophie ben said	2025-05-13 16:47:44.372412
25	LOT060	b	L	OuvrierA Mohammed	2025-05-13 14:52:40.572	2025-05-13 15:52:57.436	expédié	Chaine 1, Machine 3	2	0	2025-05-13 16:52:57.453187	2	2025-05-13 15:51:41.47	OuvrierA Mohammed	2025-05-13 16:53:10.004895
26	LOT061	b	L	sophie ben said	2025-05-13 14:59:14.546	2025-05-13 16:01:53.771	expédié	Chaine 1, Machine 1	1	0	2025-05-13 17:01:53.91142	1	2025-05-13 15:51:55.77	sophie ben said	2025-05-13 17:07:14.087606
27	LOT062	b	L	OuvrierA Mohammed	2025-05-13 15:08:35.939	2025-05-13 16:09:10.127	expédié	Chaine 1, Machine 3	2	1	2025-05-13 17:09:10.273741	1	2025-05-13 16:08:09.355	OuvrierA Mohammed	2025-05-13 17:09:24.897483
\.


--
-- TOC entry 5024 (class 0 OID 16821)
-- Dependencies: 229
-- Data for Name: lots; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.lots (lot_id, epc, taille, couleur, quantite_initiale, jeans_defectueux, quantite_finale, temps_debut, temps_debut_travail, temps_fin, statut, chaine_id, localisation, ouvrier_nom, operateur_id) FROM stdin;
\.


--
-- TOC entry 5023 (class 0 OID 16804)
-- Dependencies: 228
-- Data for Name: machines; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.machines (machine_id, nom_machine, est_disponible, chaine_id, ouvrier_id) FROM stdin;
43	Chaine 1, Machine 3	f	CH001	OUV001
49	Chaine 2, Machine 4	f	CH002	OUV002
51	Chaine 1, Machine 2	t	CH001	\N
52	Chaine 1, Machine 4	t	CH001	\N
53	Chaine 2, Machine 1	t	CH002	\N
55	Chaine 2, Machine 3	t	CH002	\N
54	Chaine 2, Machine 2	t	CH002	\N
50	Chaine 1, Machine 1	f	CH001	OUV003
\.


--
-- TOC entry 5026 (class 0 OID 16864)
-- Dependencies: 231
-- Data for Name: ouvriers; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.ouvriers (ouvrier_id, nom, prenom, telephone, chaine_id, is_active, localisation) FROM stdin;
OUV001	OuvrierA	Mohammed	0123456781	CH001	t	Chaine 1, Machine 3
OUV002	OuvrierB	Sara	0123456782	CH002	t	Chaine 2, Machine 4
OUV003	sophie	ben said	1234567891	CH001	t	Chaine 1, Machine 1
\.


--
-- TOC entry 5013 (class 0 OID 16405)
-- Dependencies: 218
-- Data for Name: roles; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.roles (role_id, nom_role) FROM stdin;
1	Operateur
2	Responsable
3	Direction
\.


--
-- TOC entry 5025 (class 0 OID 16841)
-- Dependencies: 230
-- Data for Name: utilisateurs; Type: TABLE DATA; Schema: rfid_system; Owner: postgres
--

COPY rfid_system.utilisateurs (utilisateur_id, nom, prenom, date_inscription, role_id, email, telephone, is_active, chaine_id, password) FROM stdin;
USER003	Ahmed	Benali	2025-03-23 09:00:00	2	ahmed.benali@email.com	0123456783	t	CH002	$2b$10$8Fgk312o0Lv2a8puEyn92.2TSylgDb.y3UEp59xVQDKL4ntgNgecu
USER011	Hassan	Mohamed	2025-05-01 09:00:00	2	hassan.mohamed@email.com	0123456791	t	CH001	$2b$10$UqKb2B/k1AcCeOdd2QlGueAA8GG..E8EsrAtv3.VTj8nS9IL0S4Lm
USER012	Youssef	Ali	2025-05-01 09:00:00	2	youssef.ali@email.com	0123456792	t	CH002	$2b$10$UqKb2B/k1AcCeOdd2QlGueAA8GG..E8EsrAtv3.VTj8nS9IL0S4Lm
USER004	Laamiri	Malek	2025-04-13 14:24:29	3	amirimalekk92@gmail.com	9244250595	t	\N	$2b$10$UqKb2B/k1AcCeOdd2QlGueAA8GG..E8EsrAtv3.VTj8nS9IL0S4Lm
USER007	Sami	Lakhal	2025-04-29 09:00:00	1	operateur1@email.com	0123456787	t	CH001	$2b$10$UqKb2B/k1AcCeOdd2QlGueAA8GG..E8EsrAtv3.VTj8nS9IL0S4Lm
USER008	Fatima	Zahra	2025-04-29 09:00:00	1	operateur2@email.com	0123456788	t	CH002	$2b$10$UqKb2B/k1AcCeOdd2QlGueAA8GG..E8EsrAtv3.VTj8nS9IL0S4Lm
\.


--
-- TOC entry 5045 (class 0 OID 0)
-- Dependencies: 222
-- Name: rfid_tags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rfid_tags_id_seq', 1, false);


--
-- TOC entry 5046 (class 0 OID 0)
-- Dependencies: 224
-- Name: controle_qualite_control_id_seq; Type: SEQUENCE SET; Schema: rfid_system; Owner: postgres
--

SELECT pg_catalog.setval('rfid_system.controle_qualite_control_id_seq', 31, true);


--
-- TOC entry 5047 (class 0 OID 0)
-- Dependencies: 234
-- Name: jean_id_seq; Type: SEQUENCE SET; Schema: rfid_system; Owner: postgres
--

SELECT pg_catalog.setval('rfid_system.jean_id_seq', 133, true);


--
-- TOC entry 5048 (class 0 OID 0)
-- Dependencies: 237
-- Name: jeans_history_history_id_seq; Type: SEQUENCE SET; Schema: rfid_system; Owner: postgres
--

SELECT pg_catalog.setval('rfid_system.jeans_history_history_id_seq', 5, true);


--
-- TOC entry 5049 (class 0 OID 0)
-- Dependencies: 235
-- Name: lot_history_history_id_seq; Type: SEQUENCE SET; Schema: rfid_system; Owner: postgres
--

SELECT pg_catalog.setval('rfid_system.lot_history_history_id_seq', 27, true);


--
-- TOC entry 5050 (class 0 OID 0)
-- Dependencies: 233
-- Name: lot_id_seq; Type: SEQUENCE SET; Schema: rfid_system; Owner: postgres
--

SELECT pg_catalog.setval('rfid_system.lot_id_seq', 62, true);


--
-- TOC entry 5051 (class 0 OID 0)
-- Dependencies: 227
-- Name: machines_machine_id_seq; Type: SEQUENCE SET; Schema: rfid_system; Owner: postgres
--

SELECT pg_catalog.setval('rfid_system.machines_machine_id_seq', 60, true);


--
-- TOC entry 5052 (class 0 OID 0)
-- Dependencies: 219
-- Name: roles_roleid_seq; Type: SEQUENCE SET; Schema: rfid_system; Owner: postgres
--

SELECT pg_catalog.setval('rfid_system.roles_roleid_seq', 1, true);


--
-- TOC entry 4829 (class 2606 OID 16605)
-- Name: assignations assignations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignations
    ADD CONSTRAINT assignations_pkey PRIMARY KEY (assignation_id);


--
-- TOC entry 4833 (class 2606 OID 16702)
-- Name: rfid_tags rfid_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rfid_tags
    ADD CONSTRAINT rfid_tags_pkey PRIMARY KEY (id);


--
-- TOC entry 4831 (class 2606 OID 16628)
-- Name: chaines chaines_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.chaines
    ADD CONSTRAINT chaines_pkey PRIMARY KEY (chaine_id);


--
-- TOC entry 4835 (class 2606 OID 16711)
-- Name: controle_qualite controle_qualite_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.controle_qualite
    ADD CONSTRAINT controle_qualite_pkey PRIMARY KEY (control_id);


--
-- TOC entry 4837 (class 2606 OID 16754)
-- Name: jeans jeans_epc_key; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.jeans
    ADD CONSTRAINT jeans_epc_key UNIQUE (epc);


--
-- TOC entry 4855 (class 2606 OID 17607)
-- Name: jeans_history jeans_history_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.jeans_history
    ADD CONSTRAINT jeans_history_pkey PRIMARY KEY (history_id);


--
-- TOC entry 4839 (class 2606 OID 16752)
-- Name: jeans jeans_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.jeans
    ADD CONSTRAINT jeans_pkey PRIMARY KEY (jean_id);


--
-- TOC entry 4851 (class 2606 OID 16966)
-- Name: lot_history lot_history_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.lot_history
    ADD CONSTRAINT lot_history_pkey PRIMARY KEY (history_id);


--
-- TOC entry 4843 (class 2606 OID 16829)
-- Name: lots lots_epc_key; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.lots
    ADD CONSTRAINT lots_epc_key UNIQUE (epc);


--
-- TOC entry 4845 (class 2606 OID 16827)
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (lot_id);


--
-- TOC entry 4841 (class 2606 OID 16810)
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (machine_id);


--
-- TOC entry 4849 (class 2606 OID 16871)
-- Name: ouvriers ouvriers_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.ouvriers
    ADD CONSTRAINT ouvriers_pkey PRIMARY KEY (ouvrier_id);


--
-- TOC entry 4827 (class 2606 OID 16429)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- TOC entry 4853 (class 2606 OID 17598)
-- Name: lot_history unique_lot_id; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.lot_history
    ADD CONSTRAINT unique_lot_id UNIQUE (lot_id);


--
-- TOC entry 4847 (class 2606 OID 16847)
-- Name: utilisateurs utilisateurs_pkey; Type: CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.utilisateurs
    ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (utilisateur_id);


--
-- TOC entry 4867 (class 2620 OID 16925)
-- Name: jeans trigger_update_quantite_initiale; Type: TRIGGER; Schema: rfid_system; Owner: postgres
--

CREATE TRIGGER trigger_update_quantite_initiale AFTER INSERT ON rfid_system.jeans FOR EACH ROW EXECUTE FUNCTION rfid_system.update_quantite_initiale();


--
-- TOC entry 4861 (class 2606 OID 16889)
-- Name: utilisateurs fk_chaine; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.utilisateurs
    ADD CONSTRAINT fk_chaine FOREIGN KEY (chaine_id) REFERENCES rfid_system.chaines(chaine_id);


--
-- TOC entry 4866 (class 2606 OID 17608)
-- Name: jeans_history fk_lot_history; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.jeans_history
    ADD CONSTRAINT fk_lot_history FOREIGN KEY (lot_id) REFERENCES rfid_system.lot_history(lot_id);


--
-- TOC entry 4856 (class 2606 OID 16934)
-- Name: controle_qualite fk_responsable_id; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.controle_qualite
    ADD CONSTRAINT fk_responsable_id FOREIGN KEY (responsable_id) REFERENCES rfid_system.utilisateurs(utilisateur_id);


--
-- TOC entry 4862 (class 2606 OID 16884)
-- Name: utilisateurs fk_role; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.utilisateurs
    ADD CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES rfid_system.roles(role_id);


--
-- TOC entry 4857 (class 2606 OID 16917)
-- Name: jeans jeans_ouvrier_id_fkey; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.jeans
    ADD CONSTRAINT jeans_ouvrier_id_fkey FOREIGN KEY (ouvrier_id) REFERENCES rfid_system.ouvriers(ouvrier_id);


--
-- TOC entry 4860 (class 2606 OID 16830)
-- Name: lots lots_chaine_id_fkey; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.lots
    ADD CONSTRAINT lots_chaine_id_fkey FOREIGN KEY (chaine_id) REFERENCES rfid_system.chaines(chaine_id);


--
-- TOC entry 4858 (class 2606 OID 16816)
-- Name: machines machines_chaine_id_fkey; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.machines
    ADD CONSTRAINT machines_chaine_id_fkey FOREIGN KEY (chaine_id) REFERENCES rfid_system.chaines(chaine_id);


--
-- TOC entry 4859 (class 2606 OID 17102)
-- Name: machines machines_ouvrier_id_fkey; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.machines
    ADD CONSTRAINT machines_ouvrier_id_fkey FOREIGN KEY (ouvrier_id) REFERENCES rfid_system.ouvriers(ouvrier_id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4865 (class 2606 OID 16872)
-- Name: ouvriers ouvriers_chaine_id_fkey; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.ouvriers
    ADD CONSTRAINT ouvriers_chaine_id_fkey FOREIGN KEY (chaine_id) REFERENCES rfid_system.chaines(chaine_id);


--
-- TOC entry 4863 (class 2606 OID 16853)
-- Name: utilisateurs utilisateurs_chaine_id_fkey; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.utilisateurs
    ADD CONSTRAINT utilisateurs_chaine_id_fkey FOREIGN KEY (chaine_id) REFERENCES rfid_system.chaines(chaine_id);


--
-- TOC entry 4864 (class 2606 OID 16848)
-- Name: utilisateurs utilisateurs_role_id_fkey; Type: FK CONSTRAINT; Schema: rfid_system; Owner: postgres
--

ALTER TABLE ONLY rfid_system.utilisateurs
    ADD CONSTRAINT utilisateurs_role_id_fkey FOREIGN KEY (role_id) REFERENCES rfid_system.roles(role_id);


-- Completed on 2025-05-13 18:47:42

--
-- PostgreSQL database dump complete
--

