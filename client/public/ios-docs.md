# AuthZyon iOS SDK — Documentação de Implementação

**Versão:** 1.0.0 | **Compatibilidade:** iOS 13+ | **Linguagens:** Swift 5.x / Objective-C

---

## Visão Geral

O AuthZyon iOS SDK permite integrar o sistema de validação de licenças ao seu projeto iOS. Ao compilar como `.dylib` (Dynamic Library), o SDK pode ser incorporado em qualquer projeto Xcode, exigindo que o usuário insira uma **key de licença válida** antes de acessar o aplicativo.

### Fluxo de Funcionamento

```
App Inicia
    │
    ▼
Existe session_token salvo?
    │
    ├── SIM → POST /api/ios/check-session
    │              │
    │              ├── Válida → Libera acesso ao app
    │              └── Expirada/Inválida → Exibe tela de key
    │
    └── NÃO → Exibe tela de key
                   │
                   ▼
           Usuário insere key
                   │
                   ▼
           POST /api/ios/validate-key
                   │
                   ├── Sucesso → Salva session_token → Libera acesso
                   └── Erro → Exibe mensagem de erro
```

---

## Configuração Inicial

### 1. Adicionar o SDK ao Projeto Xcode

Copie os arquivos `AuthZyon.swift` (ou `AuthZyon.h` + `AuthZyon.m` para Objective-C) para o seu projeto. Para compilar como `.dylib`:

```bash
# Compilar como Dynamic Library
swiftc -emit-library -emit-module \
  -module-name AuthZyon \
  -target arm64-apple-ios13.0 \
  AuthZyonSDK.swift \
  -o libAuthZyon.dylib
```

### 2. Configurar a URL do Servidor

Substitua `YOUR_SERVER_URL` pela URL do seu servidor AuthZyon:

```swift
// Swift
AuthZyonConfig.serverURL = "https://seu-dominio.manus.space"
```

```objc
// Objective-C
[AuthZyonConfig setServerURL:@"https://seu-dominio.manus.space"];
```

---

## Implementação Swift

### AuthZyonSDK.swift — Arquivo Principal

```swift
import Foundation
import UIKit

// MARK: - Configuração

public class AuthZyonConfig {
    public static var serverURL: String = "https://YOUR_SERVER_URL"
    public static var appTitle: String = "FFH4X"
    public static var tintColor: UIColor = UIColor(red: 0.4, green: 0.4, blue: 1.0, alpha: 1.0)
}

// MARK: - Modelos

public struct AuthZyonKeyResponse: Codable {
    public let success: Bool
    public let message: String?
    public let key: String?
    public let expiresAt: String?
    public let sessionToken: String?
    public let daysRemaining: Int?
    public let error: String?
    public let expired: Bool?
    public let needsKey: Bool?
    
    enum CodingKeys: String, CodingKey {
        case success, message, key, error, expired
        case expiresAt = "expires_at"
        case sessionToken = "session_token"
        case daysRemaining = "days_remaining"
        case needsKey = "needs_key"
    }
}

// MARK: - Storage

public class AuthZyonStorage {
    private static let sessionTokenKey = "authzyon_session_token"
    private static let deviceIDKey = "authzyon_device_id"
    
    public static func saveSessionToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: sessionTokenKey)
    }
    
    public static func getSessionToken() -> String? {
        return UserDefaults.standard.string(forKey: sessionTokenKey)
    }
    
    public static func clearSession() {
        UserDefaults.standard.removeObject(forKey: sessionTokenKey)
    }
    
    public static func getDeviceID() -> String {
        if let saved = UserDefaults.standard.string(forKey: deviceIDKey) {
            return saved
        }
        let newID = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        UserDefaults.standard.set(newID, forKey: deviceIDKey)
        return newID
    }
}

// MARK: - API Client

public class AuthZyonAPI {
    
    public static func validateKey(
        _ key: String,
        completion: @escaping (Result<AuthZyonKeyResponse, Error>) -> Void
    ) {
        let url = URL(string: "\(AuthZyonConfig.serverURL)/api/ios/validate-key")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let deviceInfo = "\(UIDevice.current.systemName) \(UIDevice.current.systemVersion)"
        let body: [String: String] = [
            "key": key.uppercased().trimmingCharacters(in: .whitespaces),
            "device_id": AuthZyonStorage.getDeviceID(),
            "device_info": deviceInfo
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let data = data else {
                completion(.failure(NSError(domain: "AuthZyon", code: -1, userInfo: [NSLocalizedDescriptionKey: "Sem resposta do servidor"])))
                return
            }
            do {
                let decoded = try JSONDecoder().decode(AuthZyonKeyResponse.self, from: data)
                completion(.success(decoded))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
    
    public static func checkSession(
        _ token: String,
        completion: @escaping (Result<AuthZyonKeyResponse, Error>) -> Void
    ) {
        let url = URL(string: "\(AuthZyonConfig.serverURL)/api/ios/check-session")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: String] = [
            "session_token": token,
            "device_id": AuthZyonStorage.getDeviceID()
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            guard let data = data else {
                completion(.failure(NSError(domain: "AuthZyon", code: -1, userInfo: [NSLocalizedDescriptionKey: "Sem resposta"])))
                return
            }
            do {
                let decoded = try JSONDecoder().decode(AuthZyonKeyResponse.self, from: data)
                completion(.success(decoded))
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
}

// MARK: - View Controller Principal

public class AuthZyonViewController: UIViewController {
    
    public var onSuccess: ((AuthZyonKeyResponse) -> Void)?
    
    // UI Elements
    private let containerView = UIView()
    private let titleLabel = UILabel()
    private let keyTextField = UITextField()
    private let validateButton = UIButton(type: .system)
    private let statusLabel = UILabel()
    private let loadingIndicator = UIActivityIndicatorView(style: .medium)
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }
    
    private func setupUI() {
        view.backgroundColor = UIColor(red: 0.07, green: 0.07, blue: 0.12, alpha: 1.0)
        
        // Container
        containerView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(containerView)
        
        // Título: FFH4X (conforme especificação)
        titleLabel.text = AuthZyonConfig.appTitle
        titleLabel.font = UIFont.systemFont(ofSize: 42, weight: .black)
        titleLabel.textColor = AuthZyonConfig.tintColor
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        
        // Campo de key
        keyTextField.placeholder = "INSIRA SUA KEY"
        keyTextField.font = UIFont.monospacedSystemFont(ofSize: 16, weight: .bold)
        keyTextField.textAlignment = .center
        keyTextField.autocapitalizationType = .allCharacters
        keyTextField.autocorrectionType = .no
        keyTextField.spellCheckingType = .no
        keyTextField.backgroundColor = UIColor(white: 0.15, alpha: 1.0)
        keyTextField.textColor = .white
        keyTextField.layer.cornerRadius = 12
        keyTextField.layer.borderWidth = 1
        keyTextField.layer.borderColor = UIColor(white: 0.3, alpha: 1.0).cgColor
        keyTextField.translatesAutoresizingMaskIntoConstraints = false
        
        // Placeholder color
        keyTextField.attributedPlaceholder = NSAttributedString(
            string: "INSIRA SUA KEY",
            attributes: [.foregroundColor: UIColor(white: 0.5, alpha: 1.0)]
        )
        
        // Padding no campo
        let paddingView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 50))
        keyTextField.leftView = paddingView
        keyTextField.leftViewMode = .always
        keyTextField.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 16, height: 50))
        keyTextField.rightViewMode = .always
        
        // Botão Entrar
        validateButton.setTitle("Entrar", for: .normal)
        validateButton.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
        validateButton.backgroundColor = AuthZyonConfig.tintColor
        validateButton.setTitleColor(.white, for: .normal)
        validateButton.layer.cornerRadius = 12
        validateButton.translatesAutoresizingMaskIntoConstraints = false
        validateButton.addTarget(self, action: #selector(validateKeyTapped), for: .touchUpInside)
        
        // Status label
        statusLabel.text = ""
        statusLabel.font = UIFont.systemFont(ofSize: 14)
        statusLabel.textAlignment = .center
        statusLabel.numberOfLines = 0
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        
        // Loading
        loadingIndicator.color = AuthZyonConfig.tintColor
        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        loadingIndicator.hidesWhenStopped = true
        
        // Add subviews
        [titleLabel, keyTextField, validateButton, statusLabel, loadingIndicator].forEach {
            containerView.addSubview($0)
        }
        
        // Constraints
        NSLayoutConstraint.activate([
            containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -40),
            containerView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 32),
            containerView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -32),
            
            titleLabel.topAnchor.constraint(equalTo: containerView.topAnchor),
            titleLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            
            keyTextField.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 40),
            keyTextField.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            keyTextField.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            keyTextField.heightAnchor.constraint(equalToConstant: 52),
            
            validateButton.topAnchor.constraint(equalTo: keyTextField.bottomAnchor, constant: 16),
            validateButton.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            validateButton.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            validateButton.heightAnchor.constraint(equalToConstant: 52),
            
            loadingIndicator.topAnchor.constraint(equalTo: validateButton.bottomAnchor, constant: 16),
            loadingIndicator.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            
            statusLabel.topAnchor.constraint(equalTo: loadingIndicator.bottomAnchor, constant: 8),
            statusLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            statusLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            statusLabel.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
        ])
    }
    
    @objc private func validateKeyTapped() {
        guard let key = keyTextField.text, !key.isEmpty else {
            showError("Key invalida, insira uma key valida\n(Se acha que foi um erro, entre em contato com seu vendedor)")
            return
        }
        
        setLoading(true)
        statusLabel.text = "Validando key..."
        statusLabel.textColor = UIColor(white: 0.7, alpha: 1.0)
        
        AuthZyonAPI.validateKey(key) { [weak self] result in
            DispatchQueue.main.async {
                self?.setLoading(false)
                switch result {
                case .success(let response):
                    if response.success {
                        // Salvar session token
                        if let token = response.sessionToken {
                            AuthZyonStorage.saveSessionToken(token)
                        }
                        self?.showSuccess(response)
                    } else {
                        if response.expired == true {
                            self?.showError("Key expirada. Insira uma nova key válida.")
                        } else {
                            self?.showError("Key invalida, insira uma key valida\n(Se acha que foi um erro, entre em contato com seu vendedor)")
                        }
                    }
                case .failure:
                    self?.showError("Erro de conexão. Verifique sua internet.")
                }
            }
        }
    }
    
    private func showSuccess(_ response: AuthZyonKeyResponse) {
        let expiryText: String
        if let expiresAt = response.expiresAt {
            expiryText = expiresAt
        } else {
            expiryText = "N/A"
        }
        
        statusLabel.text = "Key Validada ✓\nKEY: \(response.key ?? "")\nData de expiração: \(expiryText)"
        statusLabel.textColor = UIColor(red: 0.2, green: 0.8, blue: 0.4, alpha: 1.0)
        
        // Aguardar 1.5s e chamar callback de sucesso
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.onSuccess?(response)
        }
    }
    
    private func showError(_ message: String) {
        statusLabel.text = message
        statusLabel.textColor = UIColor(red: 0.9, green: 0.3, blue: 0.3, alpha: 1.0)
    }
    
    private func setLoading(_ loading: Bool) {
        validateButton.isEnabled = !loading
        keyTextField.isEnabled = !loading
        if loading {
            loadingIndicator.startAnimating()
        } else {
            loadingIndicator.stopAnimating()
        }
    }
}

// MARK: - Manager Principal (ponto de entrada)

public class AuthZyon {
    
    /// Inicializa o SDK e verifica se o usuário já tem uma sessão válida.
    /// Chame este método no AppDelegate ou SceneDelegate ao iniciar o app.
    public static func initialize(
        in window: UIWindow?,
        serverURL: String,
        appTitle: String = "FFH4X",
        onAuthenticated: @escaping () -> Void
    ) {
        AuthZyonConfig.serverURL = serverURL
        AuthZyonConfig.appTitle = appTitle
        
        // Verificar sessão existente
        if let token = AuthZyonStorage.getSessionToken() {
            showLoading(in: window, message: "Carregando login...")
            
            AuthZyonAPI.checkSession(token) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success(let response):
                        if response.success {
                            // Sessão válida - liberar acesso
                            onAuthenticated()
                        } else {
                            // Sessão inválida ou expirada - pedir nova key
                            AuthZyonStorage.clearSession()
                            showKeyScreen(in: window, onAuthenticated: onAuthenticated)
                        }
                    case .failure:
                        // Erro de rede - pedir nova key
                        AuthZyonStorage.clearSession()
                        showKeyScreen(in: window, onAuthenticated: onAuthenticated)
                    }
                }
            }
        } else {
            // Sem sessão - exibir tela de key
            showKeyScreen(in: window, onAuthenticated: onAuthenticated)
        }
    }
    
    private static func showLoading(in window: UIWindow?, message: String) {
        let loadingVC = AuthZyonLoadingViewController(message: message)
        window?.rootViewController = loadingVC
        window?.makeKeyAndVisible()
    }
    
    private static func showKeyScreen(in window: UIWindow?, onAuthenticated: @escaping () -> Void) {
        let keyVC = AuthZyonViewController()
        keyVC.onSuccess = { _ in
            onAuthenticated()
        }
        window?.rootViewController = keyVC
        window?.makeKeyAndVisible()
    }
}

// MARK: - Loading Screen

public class AuthZyonLoadingViewController: UIViewController {
    private let message: String
    
    public init(message: String) {
        self.message = message
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) { fatalError() }
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.07, green: 0.07, blue: 0.12, alpha: 1.0)
        
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        
        let titleLabel = UILabel()
        titleLabel.text = AuthZyonConfig.appTitle
        titleLabel.font = UIFont.systemFont(ofSize: 36, weight: .black)
        titleLabel.textColor = AuthZyonConfig.tintColor
        
        let spinner = UIActivityIndicatorView(style: .large)
        spinner.color = AuthZyonConfig.tintColor
        spinner.startAnimating()
        
        let msgLabel = UILabel()
        msgLabel.text = message
        msgLabel.font = UIFont.systemFont(ofSize: 15)
        msgLabel.textColor = UIColor(white: 0.6, alpha: 1.0)
        
        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(spinner)
        stack.addArrangedSubview(msgLabel)
        view.addSubview(stack)
        
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }
}
```

---

## Integração no AppDelegate (Swift)

```swift
// AppDelegate.swift
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        
        window = UIWindow(frame: UIScreen.main.bounds)
        
        // Inicializar AuthZyon
        AuthZyon.initialize(
            in: window,
            serverURL: "https://SEU-DOMINIO.manus.space",
            appTitle: "FFH4X"
        ) {
            // Este bloco é chamado quando a autenticação é bem-sucedida
            // Substitua pelo seu ViewController principal
            let mainVC = MainViewController()
            self.window?.rootViewController = mainVC
            self.window?.makeKeyAndVisible()
        }
        
        return true
    }
}
```

---

## Integração com SceneDelegate (iOS 13+)

```swift
// SceneDelegate.swift
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        
        window = UIWindow(windowScene: windowScene)
        
        AuthZyon.initialize(
            in: window,
            serverURL: "https://SEU-DOMINIO.manus.space",
            appTitle: "FFH4X"
        ) {
            let mainVC = MainViewController()
            let nav = UINavigationController(rootViewController: mainVC)
            self.window?.rootViewController = nav
            self.window?.makeKeyAndVisible()
        }
    }
}
```

---

## Implementação Objective-C

### AuthZyon.h

```objc
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

// Configuração
@interface AuthZyonConfig : NSObject
@property (class, nonatomic, copy) NSString *serverURL;
@property (class, nonatomic, copy) NSString *appTitle;
@property (class, nonatomic, strong) UIColor *tintColor;
+ (void)setServerURL:(NSString *)url;
@end

// Resposta da API
@interface AuthZyonKeyResponse : NSObject
@property (nonatomic, assign) BOOL success;
@property (nonatomic, copy, nullable) NSString *message;
@property (nonatomic, copy, nullable) NSString *key;
@property (nonatomic, copy, nullable) NSString *expiresAt;
@property (nonatomic, copy, nullable) NSString *sessionToken;
@property (nonatomic, assign) NSInteger daysRemaining;
@property (nonatomic, copy, nullable) NSString *error;
@property (nonatomic, assign) BOOL expired;
@property (nonatomic, assign) BOOL needsKey;
@end

// Storage
@interface AuthZyonStorage : NSObject
+ (void)saveSessionToken:(NSString *)token;
+ (nullable NSString *)getSessionToken;
+ (void)clearSession;
+ (NSString *)getDeviceID;
@end

// Manager principal
@interface AuthZyon : NSObject
+ (void)initializeInWindow:(UIWindow *)window
                 serverURL:(NSString *)serverURL
                  appTitle:(NSString *)appTitle
           onAuthenticated:(void (^)(void))onAuthenticated;
@end

NS_ASSUME_NONNULL_END
```

### AuthZyon.m

```objc
#import "AuthZyon.h"

@implementation AuthZyonConfig
static NSString *_serverURL = @"https://YOUR_SERVER_URL";
static NSString *_appTitle = @"FFH4X";
static UIColor *_tintColor = nil;

+ (NSString *)serverURL { return _serverURL; }
+ (void)setServerURL:(NSString *)url { _serverURL = url; }
+ (NSString *)appTitle { return _appTitle; }
+ (void)setAppTitle:(NSString *)title { _appTitle = title; }
+ (UIColor *)tintColor {
    if (!_tintColor) _tintColor = [UIColor colorWithRed:0.4 green:0.4 blue:1.0 alpha:1.0];
    return _tintColor;
}
@end

@implementation AuthZyonStorage
+ (void)saveSessionToken:(NSString *)token {
    [[NSUserDefaults standardUserDefaults] setObject:token forKey:@"authzyon_session_token"];
}
+ (NSString *)getSessionToken {
    return [[NSUserDefaults standardUserDefaults] stringForKey:@"authzyon_session_token"];
}
+ (void)clearSession {
    [[NSUserDefaults standardUserDefaults] removeObjectForKey:@"authzyon_session_token"];
}
+ (NSString *)getDeviceID {
    NSString *saved = [[NSUserDefaults standardUserDefaults] stringForKey:@"authzyon_device_id"];
    if (saved) return saved;
    NSString *newID = [[[UIDevice currentDevice] identifierForVendor] UUIDString] ?: [[NSUUID UUID] UUIDString];
    [[NSUserDefaults standardUserDefaults] setObject:newID forKey:@"authzyon_device_id"];
    return newID;
}
@end

@implementation AuthZyon
+ (void)initializeInWindow:(UIWindow *)window
                 serverURL:(NSString *)serverURL
                  appTitle:(NSString *)appTitle
           onAuthenticated:(void (^)(void))onAuthenticated {
    
    [AuthZyonConfig setServerURL:serverURL];
    [AuthZyonConfig setAppTitle:appTitle];
    
    NSString *token = [AuthZyonStorage getSessionToken];
    
    if (token) {
        // Mostrar loading e verificar sessão
        [self showLoadingInWindow:window message:@"Carregando login..."];
        [self checkSession:token window:window onAuthenticated:onAuthenticated];
    } else {
        [self showKeyScreenInWindow:window onAuthenticated:onAuthenticated];
    }
}

+ (void)checkSession:(NSString *)token
              window:(UIWindow *)window
     onAuthenticated:(void (^)(void))onAuthenticated {
    
    NSURL *url = [NSURL URLWithString:[NSString stringWithFormat:@"%@/api/ios/check-session", AuthZyonConfig.serverURL]];
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    request.HTTPMethod = @"POST";
    [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    
    NSDictionary *body = @{
        @"session_token": token,
        @"device_id": [AuthZyonStorage getDeviceID]
    };
    request.HTTPBody = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];
    
    [[[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (error || !data) {
                [AuthZyonStorage clearSession];
                [self showKeyScreenInWindow:window onAuthenticated:onAuthenticated];
                return;
            }
            NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
            if ([json[@"success"] boolValue]) {
                onAuthenticated();
            } else {
                [AuthZyonStorage clearSession];
                [self showKeyScreenInWindow:window onAuthenticated:onAuthenticated];
            }
        });
    }] resume];
}

+ (void)showLoadingInWindow:(UIWindow *)window message:(NSString *)message {
    UIViewController *vc = [[UIViewController alloc] init];
    vc.view.backgroundColor = [UIColor colorWithRed:0.07 green:0.07 blue:0.12 alpha:1.0];
    
    UILabel *titleLabel = [[UILabel alloc] init];
    titleLabel.text = AuthZyonConfig.appTitle;
    titleLabel.font = [UIFont systemFontOfSize:36 weight:UIFontWeightBlack];
    titleLabel.textColor = AuthZyonConfig.tintColor;
    titleLabel.translatesAutoresizingMaskIntoConstraints = NO;
    
    UIActivityIndicatorView *spinner = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleLarge];
    spinner.color = AuthZyonConfig.tintColor;
    spinner.translatesAutoresizingMaskIntoConstraints = NO;
    [spinner startAnimating];
    
    UILabel *msgLabel = [[UILabel alloc] init];
    msgLabel.text = message;
    msgLabel.font = [UIFont systemFontOfSize:15];
    msgLabel.textColor = [UIColor colorWithWhite:0.6 alpha:1.0];
    msgLabel.translatesAutoresizingMaskIntoConstraints = NO;
    
    [vc.view addSubview:titleLabel];
    [vc.view addSubview:spinner];
    [vc.view addSubview:msgLabel];
    
    [NSLayoutConstraint activateConstraints:@[
        [titleLabel.centerXAnchor constraintEqualToAnchor:vc.view.centerXAnchor],
        [titleLabel.centerYAnchor constraintEqualToAnchor:vc.view.centerYAnchor constant:-50],
        [spinner.centerXAnchor constraintEqualToAnchor:vc.view.centerXAnchor],
        [spinner.topAnchor constraintEqualToAnchor:titleLabel.bottomAnchor constant:20],
        [msgLabel.centerXAnchor constraintEqualToAnchor:vc.view.centerXAnchor],
        [msgLabel.topAnchor constraintEqualToAnchor:spinner.bottomAnchor constant:12],
    ]];
    
    window.rootViewController = vc;
    [window makeKeyAndVisible];
}

+ (void)showKeyScreenInWindow:(UIWindow *)window onAuthenticated:(void (^)(void))onAuthenticated {
    // Implementar UIViewController de key similar ao Swift acima
    // Por brevidade, referência ao AuthZyonViewController em Objective-C
    window.rootViewController = [[UIViewController alloc] init]; // Substituir pela implementação completa
    [window makeKeyAndVisible];
}
@end
```

---

## Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/ios/validate-key` | Valida e ativa uma key |
| `POST` | `/api/ios/check-session` | Verifica se sessão ainda é válida |
| `GET`  | `/api/ios/key-info/:key` | Informações públicas de uma key |

### POST /api/ios/validate-key

**Request:**
```json
{
  "key": "ABCDEFGHIJK",
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "device_info": "iOS 17.0"
}
```

**Response (sucesso):**
```json
{
  "success": true,
  "message": "Key Validada",
  "key": "ABCDEFGHIJK",
  "expires_at": "2025-04-24T12:00:00.000Z",
  "session_token": "a1b2c3d4e5f6...",
  "days_remaining": 30
}
```

**Response (erro):**
```json
{
  "success": false,
  "error": "Key inválida"
}
```

### POST /api/ios/check-session

**Request:**
```json
{
  "session_token": "a1b2c3d4e5f6...",
  "device_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (válida):**
```json
{
  "success": true,
  "key": "ABCDEFGHIJK",
  "expires_at": "2025-04-24T12:00:00.000Z",
  "days_remaining": 28
}
```

**Response (expirada):**
```json
{
  "success": false,
  "error": "Key expirada",
  "expired": true,
  "needs_key": true
}
```

---

## Compilar como .dylib

```bash
# 1. Compilar para simulador (x86_64)
swiftc -emit-library -emit-module \
  -module-name AuthZyon \
  -target x86_64-apple-ios13.0-simulator \
  AuthZyonSDK.swift \
  -o libAuthZyon-sim.dylib

# 2. Compilar para dispositivo real (arm64)
swiftc -emit-library -emit-module \
  -module-name AuthZyon \
  -target arm64-apple-ios13.0 \
  AuthZyonSDK.swift \
  -o libAuthZyon-arm64.dylib

# 3. Criar fat binary (universal)
lipo -create libAuthZyon-sim.dylib libAuthZyon-arm64.dylib \
  -output libAuthZyon.dylib

# 4. Adicionar ao projeto Xcode:
# - Arraste libAuthZyon.dylib para "Frameworks, Libraries, and Embedded Content"
# - Defina como "Embed & Sign"
```

---

## Checklist de Implementação

- [ ] Copiar `AuthZyonSDK.swift` para o projeto
- [ ] Configurar `serverURL` com a URL do seu servidor AuthZyon
- [ ] Chamar `AuthZyon.initialize()` no `AppDelegate` ou `SceneDelegate`
- [ ] Implementar o callback `onAuthenticated` para exibir o app principal
- [ ] Testar com uma key válida gerada no painel
- [ ] Testar comportamento com key expirada
- [ ] Testar auto-login ao fechar e reabrir o app

---

*Documentação gerada pelo AuthZyon — Sistema de Licenciamento iOS*
