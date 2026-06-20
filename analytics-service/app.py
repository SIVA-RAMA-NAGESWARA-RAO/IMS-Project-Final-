import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from database import engine, Base
from routes.events import events_bp
from routes.reports import reports_bp

load_dotenv()

app = Flask(__name__)
CORS(app)

app.register_blueprint(events_bp)
app.register_blueprint(reports_bp)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ims-analytics-service"})


if __name__ == "__main__":
    # Creates recruitment_events if it doesn't exist yet (schema.sql does the same for manual setup).
    Base.metadata.create_all(bind=engine)
    port = int(os.getenv("PORT", 6000))
    app.run(host="0.0.0.0", port=port, debug=True)
