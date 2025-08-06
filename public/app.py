"""
Fridge IoT – Dribbble-style dark dashboard ✨
author: you
"""

# ─────────────────────────  Imports
import pandas as pd, numpy as np, plotly.express as px, plotly.graph_objects as go
from dash import Dash, dcc, html, Input, Output, State
import dash_bootstrap_components as dbc
from pathlib import Path

# ─────────────────────────  CONFIG
CSV_PATH          = Path(__file__).with_name("fridge_enriched.csv")
BOOTSTRAP_THEME   = dbc.themes.CYBORG           # dark, accessible
FONT_URL          = "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap"
FA_URL            = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
LottieCDN         = "https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"
ACCENT            = "#00e1ff"

REFRESH_MS        = 10_000      # auto-refresh interval

# ─────────────────────────  App & assets
external_stylesheets=[FONT_URL, FA_URL, BOOTSTRAP_THEME]
external_scripts=[LottieCDN]

app = Dash(__name__,
           external_stylesheets=external_stylesheets,
           external_scripts=external_scripts,
           title="IoT Energy Dashboard")

server = app.server   # for production deployment

def load_data():
    df = pd.read_csv(CSV_PATH, parse_dates=["Time"])
    if pd.api.types.is_datetime64tz_dtype(df["Time"]):
        df["Time"] = df["Time"].dt.tz_localize(None)
    df["unix"] = (df["Time"] - pd.Timestamp("1970-01-01")) // pd.Timedelta("1s")
    return df

df = load_data()      # initial read

# ─────────────────────────  Helper: KPI card
def kpi(id_icon, label, value, unit=""):
    return dbc.Card(
        dbc.CardBody([
            html.I(className=f"fa-solid fa-{id_icon} fa-xl", style={"color":ACCENT}),
            html.H4(f"{value}{unit}", className="mt-2 mb-0 fw-bold"),
            html.Small(label, className="text-muted"),
        ]),
        className="kpi-card flex-grow-1"
    )

# ─────────────────────────  Layout
app.layout = dbc.Container(fluid=True, children=[
    # Header strip
    dbc.Row([
        dbc.Col(html.H2("⚡ Fridge IoT Dashboard", className="fw-semibold"),
                width="auto"),
        dbc.Col(html.Div(), className="flex-grow-1"),
        dbc.Col(dbc.Switch(id="live-toggle", value=True,
                           label="Live", label_checked="Live",
                           className="mt-2"), width="auto"),
    ], align="center", className="my-2"),

    # KPI row (dynamic)
    dbc.Row(id="kpi-row", className="g-3"),

    # Range-slider
    dbc.Row([
        dcc.RangeSlider(
            id="time-slider",
            min=df["unix"].min(), max=df["unix"].max(),
            value=[df["unix"].min(), df["unix"].max()],
            step=60, allowCross=False,
            tooltip={"placement":"bottom", "always_visible":False},
        ),
    ], className="my-3"),

    # Tabs with charts
    dbc.Tabs([
        dbc.Tab(label="Power & Energy",  tab_id="tab-power"),
        dbc.Tab(label="Quality",         tab_id="tab-quality"),
        dbc.Tab(label="Cost",            tab_id="tab-cost"),
    ], id="tabs", active_tab="tab-power", className="mb-3"),

    html.Div(id="tab-content"),     # chart placeholder

    # Device photo placeholder + animation
    dbc.Row([
        dbc.Col([
            html.H4("Your IoT Device"),
            html.Div("Drag & drop a photo into /assets and replace this.",
                     id="device-box",
                     style={"border":f"2px dashed {ACCENT}",
                            "height":"220px","display":"flex","alignItems":"center",
                            "justifyContent":"center","borderRadius":"8px",
                            "opacity":0.75}),
        ], md=6),
        dbc.Col([
            html.H4("Tips"),
            html.Ul([
                html.Li("Duty cycle >70 % ⇒ check door gasket or ambient heat."),
                html.Li("Voltage dips >8 % can harm compressors."),
                html.Li("Hover a plot & press <b>Download</b> ↗ to save PNG."),
            ], style={"fontSize":"0.9rem"}),
        ], md=6),
    ], className="gy-4"),

    # Hidden auto-refresh timer
    dcc.Interval(id="refresh", interval=REFRESH_MS, n_intervals=0)
], style={"fontFamily":"Poppins, sans-serif"})

# ─────────────────────────  Callbacks

def slice_by_slider(data, slider):
    t0, t1 = [pd.to_datetime(v, unit="s") for v in slider]
    return data[(data["Time"]>=t0) & (data["Time"]<=t1)]

@app.callback(
    Output("kpi-row","children"),
    Output("tab-content","children"),
    Input("time-slider","value"),
    Input("tabs","active_tab"),
    Input("refresh","n_intervals"),
    Input("live-toggle","value"))
def update_dashboard(slider_range, tab, n, live_on):
    data = load_data() if live_on else df                # refresh if live
    dff  = slice_by_slider(data, slider_range)

    # === KPIs
    total_kwh  = dff["Energy_kWh"].iloc[-1] - dff["Energy_kWh"].iloc[0]
    cost_bd    = dff["Cost_cum_BDT"].iloc[-1] - dff["Cost_cum_BDT"].iloc[0]
    avg_volt   = dff["Voltage_V"].mean()
    duty_now   = dff["DutyCycle_%_24H"].iloc[-1]

    kpis = [
        kpi("bolt-lightning","Energy", f"{total_kwh:,.2f}"," kWh"),
        kpi("coins","Cost", f"{cost_bd:,.0f}"," BDT"),
        kpi("gauge-high","Avg V", f"{avg_volt:,.0f}"," V"),
        kpi("snowflake","Duty 24h", f"{duty_now:,.0f}"," %"),
    ]

    # === Charts per tab
    if tab=="tab-power":
        fig = px.area(
            dff, x="Time", y="ActivePower_kW",
            title="Active Power – spline",
            line_shape="spline", color_discrete_sequence=[ACCENT]
        )
        fig.update_traces(fill="tozeroy", fillcolor="rgba(0,225,255,0.3)")
        fig2 = px.line(
            dff, x="Time",
            y=(dff["Energy_kWh"]-dff["Energy_kWh"].iloc[0]),
            line_shape="hv", labels={"y":"kWh"},
            title="Accumulated Energy (interval)")
        for g in (fig, fig2):
            g.update_layout(template="plotly_dark", height=350, title_x=0.5)
        content = dbc.Row([
            dbc.Col(dcc.Graph(figure=fig, config={"displayModeBar":False}), md=6),
            dbc.Col(dcc.Graph(figure=fig2,config={"displayModeBar":False}), md=6),
        ])

    elif tab=="tab-quality":
        # PF gauge
        gauge = go.Figure(go.Indicator(
            mode="gauge+number+delta", value=dff["PowerFactor"].mean(),
            domain={"x":[0,1], "y":[0,1]},
            title={"text":"Mean PF"},
            gauge={
                "axis":{"range":[0,1]},
                "bar":{"color":ACCENT},
                "steps":[{"range":[0,.7],"color":"#842"}, {"range":[.7,.9],"color":"#b8860b"},
                         {"range":[.9,1],"color":"#246"}],
            }
        )).update_layout(template="plotly_dark", height=350)
        # Voltage histogram
        hist = px.histogram(dff, x="Voltage_Deviation_%", nbins=40,
                            color_discrete_sequence=[ACCENT],
                            title="Voltage deviation histogram (%)")
        hist.update_layout(template="plotly_dark", height=350, title_x=0.5)
        content = dbc.Row([
            dbc.Col(dcc.Graph(figure=gauge, config={"displayModeBar":False}), md=6),
            dbc.Col(dcc.Graph(figure=hist,  config={"displayModeBar":False}), md=6),
        ])

    else:  # tab-cost
        # Cost bullet & pie
        bullet = go.Figure(go.Indicator(
            mode="number+gauge", value=cost_bd,
            gauge={"shape":"bullet","axis":{"range":[0,max(cost_bd*1.2,50)]},
                   "bar":{"color":ACCENT}},
            title={"text":"Cost in range (BDT)"}
        )).update_layout(template="plotly_dark", height=200)
        # Pie by day-hour energy
        dff["hour"] = dff["Time"].dt.hour
        pie = px.pie(dff.groupby("hour")["dE_kWh"].sum().reset_index(),
                     names="hour", values="dE_kWh", hole=0.35,
                     title="Energy share by hour")
        pie.update_layout(template="plotly_dark", height=400, title_x=0.5)
        content = dbc.Row([
            dbc.Col(dcc.Graph(figure=bullet, config={"displayModeBar":False}), md=4),
            dbc.Col(dcc.Graph(figure=pie,    config={"displayModeBar":False}), md=8),
        ])
    return kpis, content

# ─────────────────────────  Custom CSS (inline for brevity)
app.clientside_callback(
    """
    function(_) {
        const style = document.createElement("style");
        style.textContent = `
        body {background:#111!important;}
        .kpi-card {background:#1a1a1a;border:none;
                   box-shadow:inset 2px 2px 4px #0d0d0d,
                              inset -2px -2px 4px #222;}
        .kpi-card:hover{box-shadow:0 0 10px """+ACCENT+"""66;}
        #device-box:hover{opacity:1;}
        `;
        document.head.appendChild(style);
        return "";
    }
    """,
    Output("device-box","style"),  # dummy
    Input("device-box","n_clicks"),    # dummy
)

# ─────────────────────────  Main
if __name__ == "__main__":
    app.run_server(host="0.0.0.0", port=8050, debug=False)
