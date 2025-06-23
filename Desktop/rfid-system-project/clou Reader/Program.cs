using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using ClouReaderAPI;
using ClouReaderAPI.Models;
using System.Collections.Generic;

namespace Console_Test
{
    class Program : ClouReaderAPI.ClouInterface.IAsynchronousMessage
    {
        private static readonly HttpClient _httpClient = new HttpClient();
        private static readonly string _apiUrl = "http://localhost:5000/api/lots/stockage";
        private static readonly string _apiDetectCountUrl = "http://localhost:5000/api/lots/detect-count";
        private static readonly string _apiCheckEpcUrl = "http://localhost:5000/api/lot-history/stock";
        private static readonly string _readerIp = "192.168.10.110:9090";
        private static readonly object _lock = new object();
        private static DateTime _lastUpdate = DateTime.MinValue;
        private static List<string> _detectedTags = new List<string>();
        private static List<string> _lotTags = new List<string>();
        private static string _currentLotId = null;
        private static string _lotEpc = null;
        private static DateTime _startTime;
        private static readonly int _maxReadDurationSeconds = 10;
        private static bool _hasProcessedTagsOver = false;

        static async Task Main(string[] args)
        {
            Console.WriteLine("Démarrage de l'application RFID pour mise à jour du statut 'stocké'... Date: {0}", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));

            var program = new Program();

            if (ClouReaderAPI.CLReader.CreateTcpConn(_readerIp, program))
            {
                Console.WriteLine("Connexion au lecteur RFID réussie. Date: {0}", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));

                _startTime = DateTime.Now;
                int readResult = ClouReaderAPI.CLReader._Tag6C.GetEPC_TID_UserData(
                    _readerIp,
                    eAntennaNo._1,
                    eReadType.While,
                    0,
                    6
                );
                if (readResult == 0)
                {
                    Console.WriteLine("Lecture démarrée avec succès sur l’antenne 1. Place un tag RFID à portée. Date: {0}", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
                }
                else
                {
                    Console.WriteLine("Erreur lors du démarrage de la lecture : Code {0}. Veuillez vérifier la configuration du lecteur. Date: {1}", readResult, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
                }

                Console.WriteLine("Lecteur RFID démarré. En attente de tags... Date: {0}", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
                Console.WriteLine("Appuyez sur une touche pour arrêter (ou la lecture s'arrêtera automatiquement après {0} secondes)...", _maxReadDurationSeconds);

                while ((DateTime.Now - _startTime).TotalSeconds < _maxReadDurationSeconds && !Console.KeyAvailable)
                {
                    await Task.Delay(100);
                }

                ClouReaderAPI.CLReader._Tag6C.Stop(_readerIp);
                if (!_hasProcessedTagsOver)
                {
                    program.OutPutTagsOver();
                    _hasProcessedTagsOver = true;
                }
                ClouReaderAPI.CLReader.CloseConn(_readerIp);
                Console.WriteLine("Lecteur arrêté et connexion fermée. Date: {0}", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
            }
            else
            {
                Console.WriteLine("Erreur de connexion au lecteur RFID ! Date: {0}", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
            }
        }

        #region Interface Method - ClouReaderAPI Callbacks

        public void OutPutTags(Tag_Model tag)
        {
            if (!string.IsNullOrEmpty(tag.EPC))
            {
                lock (_lock)
                {
                    string epc = tag.EPC.Trim().ToUpper();
                    Console.WriteLine("Tag détecté - EPC: {0}, TID: {1}, UserData: {2}, Date: {3}", epc, tag.TID, tag.UserData, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));

                    if (!_detectedTags.Contains(epc))
                    {
                        _detectedTags.Add(epc);
                        Console.WriteLine("Tag ajouté à la liste - EPC: {0}, Total tags détectés: {1}, Date: {2}", epc, _detectedTags.Count, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));

                        Task.Run(async () =>
                        {
                            // Vérification pour la logique de detected_count
                            bool isLotTag = await CheckIfLotTag(epc);
                            if (isLotTag)
                            {
                                _lotTags.Add(epc);
                                if (_lotEpc == null)
                                {
                                    _lotEpc = epc;
                                }
                            }

                            // Mise à jour du statut "stocké" pour chaque tag (comme dans l'ancien code)
                            if ((DateTime.Now - _lastUpdate).TotalSeconds > 5)
                            {
                                await UpdateStockStatus(epc, DateTime.Now);
                                _lastUpdate = DateTime.Now;
                            }
                        }).GetAwaiter().GetResult();
                    }
                }
            }
            else
            {
                Console.WriteLine("Tag détecté, mais EPC vide. Date: {0}", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
            }
        }

        public void OutPutTagsOver()
        {
            if (_hasProcessedTagsOver) return;

            Console.WriteLine("Lecture des tags terminée. Date: {0}", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
            lock (_lock)
            {
                if (_currentLotId != null && _detectedTags.Count > 0)
                {
                    int detectedCount = _detectedTags.Count - _lotTags.Count;
                    Console.WriteLine("Mise à jour de detected_count pour lot_id {0}: {1}, Date: {2}", _currentLotId, detectedCount, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
                    Task.Run(() => UpdateDetectedCount(_currentLotId, detectedCount)).GetAwaiter().GetResult();
                }
                else
                {
                    Console.WriteLine("Aucun lot_id ou tags détectés pour mise à jour de detected_count. lot_id: {0}, tags détectés: {1}", _currentLotId ?? "null", _detectedTags.Count);
                }
                _detectedTags.Clear();
                _lotTags.Clear();
                _currentLotId = null;
                _lotEpc = null;
                _hasProcessedTagsOver = true;
            }
        }

        public void WriteDebugMsg(string msg)
        {
            Console.WriteLine("Debug: {0} - Date: {1}", msg, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
        }

        public void WriteLog(string msg)
        {
            Console.WriteLine("Log: {0} - Date: {1}", msg, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
        }

        public void PortConneting(string connID)
        {
            Console.WriteLine("Connexion au port: {0} - Date: {1}", connID, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
        }

        public void PortClosing(string connID)
        {
            Console.WriteLine("Fermeture du port: {0} - Date: {1}", connID, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
        }

        public void GPIControlMsg(int gpiIndex, int gpiState, int startOrStop)
        {
            Console.WriteLine("GPI Control - Index: {0}, State: {1}, Start/Stop: {2} - Date: {3}", gpiIndex, gpiState, startOrStop, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
        }

        #endregion

        private async Task<bool> CheckIfLotTag(string epc)
        {
            try
            {
                Console.WriteLine("Vérification si EPC {0} est un tag de lot via API {1}...", epc, _apiCheckEpcUrl);
                var response = await _httpClient.GetAsync(_apiCheckEpcUrl);
                if (response.IsSuccessStatusCode)
                {
                    string responseContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine("Réponse de l'API /api/lot-history/stock: {0}", responseContent);
                    var lots = JsonConvert.DeserializeObject<List<dynamic>>(responseContent);
                    foreach (var lot in lots)
                    {
                        if (lot.epc.ToString().Trim().ToUpper() == epc)
                        {
                            _currentLotId = lot.lot_id.ToString();
                            Console.WriteLine("Tag de lot confirmé - EPC: {0}, lot_id: {1}, Date: {2}", epc, _currentLotId, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
                            return true;
                        }
                    }
                    Console.WriteLine("EPC {0} non trouvé dans la réponse de l'API.", epc);
                }
                else
                {
                    string errorContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine("Erreur lors de la vérification de l'EPC {0} : {1} - {2}", epc, response.StatusCode, errorContent);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Erreur lors de la vérification de l'EPC {0} : {1}", epc, ex.Message);
            }
            return false;
        }

        private async Task UpdateStockStatus(string epc, DateTime detectionTime)
        {
            try
            {
                Console.WriteLine("Préparation de la requête API pour EPC: {0}, Date: {1}", epc, detectionTime.ToString("yyyy-MM-dd HH:mm:ss CET"));
                var requestData = new
                {
                    epc = epc,
                    date_stockage = detectionTime.ToString("yyyy-MM-dd HH:mm:ss CET")
                };

                var content = new StringContent(
                    JsonConvert.SerializeObject(requestData),
                    Encoding.UTF8,
                    "application/json"
                );

                Console.WriteLine("Envoi de la requête API à {0}...", _apiUrl);
                var response = await _httpClient.PostAsync(_apiUrl, content);
                if (response.IsSuccessStatusCode)
                {
                    string responseContent = await response.Content.ReadAsStringAsync();
                    var responseData = JsonConvert.DeserializeObject<dynamic>(responseContent);
                    if (responseData.lot_id != null)
                    {
                        _currentLotId = responseData.lot_id.ToString();
                    }
                    Console.WriteLine("Statut du lot avec EPC {0} mis à jour avec succès en 'stocké' à {1}. Réponse: {2}", epc, detectionTime.ToString("yyyy-MM-dd HH:mm:ss CET"), responseContent);
                }
                else
                {
                    string errorContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine("Erreur API : {0} - {1} - Date: {2}", response.StatusCode, errorContent, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Erreur lors de la mise à jour du statut pour EPC {0} : {1} - Date: {2}", epc, ex.Message, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
            }
        }

        private async Task UpdateDetectedCount(string lotId, int detectedCount)
        {
            try
            {
                Console.WriteLine("Préparation de la requête API pour lot_id: {0}, detected_count: {1}, Date: {2}", lotId, detectedCount, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
                var requestData = new
                {
                    lot_id = lotId,
                    detected_count = detectedCount
                };

                var content = new StringContent(
                    JsonConvert.SerializeObject(requestData),
                    Encoding.UTF8,
                    "application/json"
                );

                Console.WriteLine("Envoi de la requête API à {0}...", _apiDetectCountUrl);
                var response = await _httpClient.PostAsync(_apiDetectCountUrl, content);
                if (response.IsSuccessStatusCode)
                {
                    string responseContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine("detected_count mis à jour avec succès pour lot_id {0}: {1}. Réponse: {2}", lotId, detectedCount, responseContent);
                }
                else
                {
                    string errorContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine("Erreur API : {0} - {1} - Date: {2}", response.StatusCode, errorContent, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Erreur lors de la mise à jour de detected_count pour lot_id {0} : {1} - Date: {2}", lotId, ex.Message, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss CET"));
            }
        }
    }
}