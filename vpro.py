from flask import Flask, render_template, jsonify, request
import json
import subprocess
import os
from pathlib import Path

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent

NODE_SCRIPTS_DIR = BASE_DIR / 'node_scripts'
DISCOVER_SCRIPT = NODE_SCRIPTS_DIR / 'VPro_discover.js'
CONNECT_SCRIPT = NODE_SCRIPTS_DIR / 'VPro_connect.js'

# Load VPRO device configurations
CONFIG_PATH = BASE_DIR / 'config.json'
with open(CONFIG_PATH, 'r') as f:
    VPRO_CONFIG = json.load(f)

def run_node_script(script_path, args):
    """Run a Node.js script with given arguments and return the output"""
    try:
        cmd = ['node', str(script_path)] + args
        print(f"Running command: {' '.join(cmd)}") 
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.stderr:
            print(f"Script error output: {result.stderr}")  
        return json.loads(result.stdout) if result.stdout else None
    except Exception as e:
        print(f"Error running script: {e}")
        return None

def get_matrix_state(vpro_ip):
    """Get the current matrix state for a VPRO device"""
    args = ['-h', vpro_ip, '-p', '9000']
    return run_node_script(DISCOVER_SCRIPT, args)

def create_connection(vpro_ip, source, target):
    """Create a connection on a VPRO device"""
    args = ['-h', vpro_ip, '-p', '9000', '-s', str(source), '-t', str(target)]
    return run_node_script(CONNECT_SCRIPT, args)

@app.route('/')
def index():
    """Main page showing all VPRO devices"""
    return render_template('index.html', vpros=VPRO_CONFIG['VPro'])

@app.route('/api/matrix/<vpro_name>')
def get_vpro_matrix(vpro_name):
    """API endpoint to get matrix state for a specific VPRO"""
    vpro_ip = VPRO_CONFIG['VPro'].get(vpro_name)
    if not vpro_ip:
        return jsonify({'error': 'VPRO not found'}), 404
    
    matrix_state = get_matrix_state(vpro_ip)
    if matrix_state is None:
        return jsonify({'error': 'Failed to get matrix state'}), 500
    return jsonify(matrix_state)

@app.route('/api/connect', methods=['POST'])
def connect():
    """API endpoint to create a connection"""
    data = request.json
    vpro_name = data.get('vpro')
    source = data.get('source')
    target = data.get('target')
    
    vpro_ip = VPRO_CONFIG['VPro'].get(vpro_name)
    if not vpro_ip:
        return jsonify({'error': 'VPRO not found'}), 404
    
    result = create_connection(vpro_ip, source, target)
    return jsonify({'success': True if result else False})

if __name__ == '__main__':
    os.makedirs(NODE_SCRIPTS_DIR, exist_ok=True)
    
    if not DISCOVER_SCRIPT.exists():
        print(f"Warning: Discovery script not found at {DISCOVER_SCRIPT}")
    if not CONNECT_SCRIPT.exists():
        print(f"Warning: Connect script not found at {CONNECT_SCRIPT}")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
