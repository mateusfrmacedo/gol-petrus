// A escolha vale para a carroceria, rodas, dimensões de contato e colisão.
const VEHICLES = { current: 'gol', baseline: null };
function vehicleChoice(id, reset) {
  if (id !== 'gol' && id !== 'civic') return false;
  if (!VEHICLES.baseline) VEHICLES.baseline = { ...VP };
  Object.assign(VP, VEHICLES.baseline);
  VEHICLES.current = id;
  if (id === 'civic') {
    VP.L = CIVIC.wheelbase; VP.a = VP.L * .43; VP.b = VP.L - VP.a;
    VP.tw = CIVIC_META.track; VP.R = CIVIC.wheelR;
    VP.m = 1300; VP.Izz = 1900;
    VP.halfW = Math.max(Math.abs(CIVIC_META.bounds[0][2]), Math.abs(CIVIC_META.bounds[1][2]));
    const cgOffset = VP.L / 2 - VP.a;
    VP.front = CIVIC_META.bounds[1][0] - cgOffset; VP.rear = -CIVIC_META.bounds[0][0] + cgOffset;
  }
  WLX[0] = WLX[1] = VP.a; WLX[2] = WLX[3] = -VP.b;
  WLZ[0] = WLZ[2] = -VP.tw / 2; WLZ[1] = WLZ[3] = VP.tw / 2;
  const select = document.getElementById('vehicle-choice'); if (select) select.value = id;
  const subtitle = document.getElementById('vehicle-name'); if (subtitle) subtitle.textContent = id === 'civic' ? 'Honda Civic 2019 · circuito' : 'VW Gol G6 1.0 MSI branco · circuito';
  try { localStorage.setItem('gol-veiculo', id); } catch (e) { /* escolha válida nesta sessão */ }
  if (reset && GAME.mode === 'game') {
    GS.replayOn = false; GS.freeCam = false; GS.frozen = false;
    gameRestart(); GS.cut = true; GS.chaseInit = false;
    if (GAME.ui && (UI.st === ST.RESULT || UI.back === ST.FITA)) { UI.back = ST.JOGO; uiSet(ST.PAUSA); }
  } else if (reset) {
    const zero = new Float32Array(4), car = carObj(); car.inp.fill(0); car.place(m4(), zero, zero); car.place(m4(), zero, zero);
  }
  if (GAME.ready) { R.cam.first = true; renderFrame(); }
  return true;
}
