Feature: Creacion de promociones por upload-promo y quick-upload-promo
  Como usuario registrado de DameCodigo
  Quiero crear promociones desde la app movil
  Para publicar cupones QR o promociones rapidas con redireccion

  Background:
    Given la API base es "https://damecodigo.com"
    And el endpoint de analisis de imagenes es "POST /api/promotions/analyze-image"
    And el endpoint de creacion de promociones es "POST /api/promotions"
    And el usuario tiene registro KYC con "userName"

  Rule: Analisis de imagenes con IA

    Scenario: Analizar imagenes validas para rellenar el formulario
      Given el usuario selecciona entre 1 y 5 imagenes
      When la app envia las imagenes por "POST /api/promotions/analyze-image"
      And el body es "multipart/form-data"
      And cada archivo usa el campo "images"
      Then la respuesta debe tener "success" igual a true
      And la respuesta puede incluir el schema "AnalyzeImageData"
      And la app debe mapear "title" al titulo del formulario
      And la app debe mapear "description" a la descripcion del formulario
      And la app debe mapear "productName" al nombre de producto
      And la app debe mapear "brand" a la marca
      And la app debe mapear "category" solo si es un valor permitido
      And la app debe mapear "originalPrice" al precio original
      And la app debe mapear "currentPrice" al precio actual
      And la app debe mapear "offerType" solo si es un valor permitido
      And la app debe mapear "cashbackValue" al valor de cashback
      And la app debe mapear "termsAndConditions" a terminos y condiciones
      And la app debe conservar las mismas imagenes para el request de creacion

    Scenario: Evitar analisis con cantidad invalida de imagenes
      Given el usuario no selecciona imagenes o selecciona mas de 5
      When la app intenta analizar imagenes
      Then la app no debe llamar "POST /api/promotions/analyze-image"
      And debe permitir completar la promocion manualmente

    Scenario: Manejar error del analisis de imagenes
      Given el usuario selecciona imagenes validas
      When la app envia "POST /api/promotions/analyze-image"
      And el backend responde HTTP no OK o "success" igual a false
      Then la app debe mostrar un error de analisis
      And el usuario debe poder completar el formulario manualmente

  Rule: Creacion de upload-promo con cupon QR

    Scenario: Crear una promocion normal sin imagenes
      Given el usuario esta en modo "qr"
      And el formulario tiene "title" con texto
      And el formulario no tiene imagenes
      When la app envia la promocion por "POST /api/promotions"
      Then el request debe usar "application/json"
      And el body debe cumplir el schema "PromotionPayload"
      And el body debe incluir "title"
      And el body debe incluir "status" con valor "draft"
      And el body debe incluir "isPhysicalStore" con valor false
      And el body no debe incluir "redirectInsteadOfQr" con valor true
      And el body no debe incluir "redirectToUrl"

    Scenario: Crear una promocion normal con imagenes
      Given el usuario esta en modo "qr"
      And el formulario tiene "title" con texto
      And el formulario tiene entre 1 y 5 imagenes
      When la app envia la promocion por "POST /api/promotions"
      Then el request debe usar "multipart/form-data"
      And cada imagen debe enviarse con el campo "images"
      And los campos numericos deben enviarse como strings en FormData
      And el body debe incluir "status" con valor "draft"
      And el body no debe incluir "redirectInsteadOfQr" con valor true

    Scenario: Bloquear creacion sin titulo
      Given el formulario no tiene "title"
      When el usuario presiona publicar promocion
      Then la app debe mostrar el error "El titulo es obligatorio."
      And la app no debe llamar "POST /api/promotions"

  Rule: Creacion de quick-upload-promo con redireccion

    Scenario: Crear una quick-upload-promo con URL de destino
      Given el usuario esta en modo "redirect"
      And el formulario tiene "title" con texto
      And el formulario tiene "redirectToUrl" con valor "https://example.com/producto"
      When la app envia la promocion por "POST /api/promotions"
      Then el body debe cumplir el schema "PromotionPayload"
      And el body debe incluir "redirectInsteadOfQr" con valor true
      And el body debe incluir "redirectToUrl" con valor "https://example.com/producto"
      And el body debe incluir "status" con valor "draft"
      And la promocion debe comportarse como redireccion en vez de cupon QR

    Scenario: Crear una quick-upload-promo sin URL de destino
      Given el usuario esta en modo "redirect"
      And el formulario tiene "title" con texto
      And el formulario no tiene "redirectToUrl"
      When la app envia la promocion por "POST /api/promotions"
      Then el body debe incluir "redirectInsteadOfQr" con valor true
      And el body no debe incluir "redirectToUrl"
      And el backend puede aplicar su comportamiento de redireccion por defecto

  Rule: Validacion de ubicacion GPS

    Scenario: Crear promocion geolocalizada para redencion en mundo real
      Given el usuario esta en modo "qr"
      And el usuario activa "gpsActivation"
      And "storeLatitude" esta entre -90 y 90
      And "storeLongitude" esta entre -180 y 180
      And "locationRadiusMeters" esta entre 50 y 50000
      When la app envia la promocion por "POST /api/promotions"
      Then el body debe incluir "redemptionType" con valor "in_store_qr"
      And el body debe incluir "fulfillmentType" con valor "physical_store"
      And el body debe incluir "isPhysicalStore" con valor true
      And el body debe incluir "gpsActivationEnabled" con valor true
      And el body debe incluir "geoRedemption.validationMoment" con valor "coupon_issue"
      And el body no debe incluir "redirectInsteadOfQr" con valor true

    Scenario: Evitar GPS en quick-upload-promo de redireccion
      Given el usuario esta en modo "redirect"
      And el usuario activa "gpsActivation"
      When el usuario presiona publicar promocion
      Then la app debe bloquear el envio
      And la app debe explicar que GPS solo aplica a cupon QR en tienda fisica
      And la app no debe llamar "POST /api/promotions"

    Scenario: Crear promocion con GPS valido
      Given el usuario activa "gpsActivation"
      And "storeLatitude" esta entre -90 y 90
      And "storeLongitude" esta entre -180 y 180
      And "locationRadiusMeters" esta entre 50 y 50000
      When la app envia la promocion por "POST /api/promotions"
      Then el body debe incluir "gpsActivationEnabled" con valor true
      And el body debe incluir "locationRadiusMeters"
      And el body debe incluir "storeLatitude"
      And el body debe incluir "storeLongitude"

    Scenario: Bloquear promocion con GPS invalido
      Given el usuario activa "gpsActivation"
      And "storeLatitude", "storeLongitude" o "locationRadiusMeters" es invalido
      When el usuario presiona publicar promocion
      Then la app debe mostrar un error de validacion GPS
      And la app no debe llamar "POST /api/promotions"

  Rule: Respuesta de creacion

    Scenario: Abrir mapa para cupon geolocalizado
      Given una promocion tiene "redemptionType" con valor "in_store_qr"
      And la promocion tiene "gpsActivationEnabled" con valor true
      When el usuario selecciona la promocion desde Home
      Then la app debe navegar al componente "Mapa de promociones"
      And la app no debe abrir el QR de redencion directamente desde Home

    Scenario: Creacion exitosa de promocion
      Given la app envio "POST /api/promotions"
      When el backend responde HTTP OK
      And la respuesta no tiene "success" igual a false
      Then la app debe considerar la creacion exitosa
      And debe sumar 10 tokens LUXAE al usuario
      And debe limpiar el formulario
      And si la respuesta incluye "data.id", debe ofrecer abrir "https://damecodigo.com/promotion-details/{id}"

    Scenario: Error al crear promocion
      Given la app envio "POST /api/promotions"
      When el backend responde HTTP no OK o "success" igual a false
      Then la app debe mostrar el mensaje de error del backend
      And debe ofrecer abrir "https://damecodigo.com/quick-promotion"

  Rule: Schemas permitidos

    Scenario: Schema AnalyzeImageData
      Then "AnalyzeImageData" debe permitir los campos:
        | field              | type                                                       |
        | title              | string                                                     |
        | description        | string                                                     |
        | productName        | string                                                     |
        | brand              | string                                                     |
        | category           | electronics, fashion, home, beauty, sports, books, food, other |
        | originalPrice      | number                                                     |
        | currentPrice       | number                                                     |
        | discountPercentage | number                                                     |
        | offerType          | percentage, bogo, cashback_fixed, cashback_percentage        |
        | cashbackValue      | number or null                                             |
        | termsAndConditions | string                                                     |

    Scenario: Schema PromotionPayload
      Then "PromotionPayload" debe permitir los campos:
        | field                | type                                                | required |
        | title                | string                                              | yes      |
        | description          | string                                              | no       |
        | productName          | string                                              | no       |
        | brand                | string                                              | no       |
        | category             | string                                              | no       |
        | originalPrice        | number                                              | no       |
        | currentPrice         | number                                              | no       |
        | currency             | USD, MXN                                            | no       |
        | discountPercentage   | number                                              | no       |
        | offerType            | percentage, bogo, cashback_fixed, cashback_percentage | no       |
        | cashbackValue        | number or null                                      | no       |
        | termsAndConditions   | string                                              | no       |
        | totalQuantity        | number                                              | no       |
        | storeName            | string                                              | no       |
        | storeLocation        | PromotionStoreLocation                              | no       |
        | isPhysicalStore      | boolean                                             | no       |
        | validFrom            | string                                              | no       |
        | validUntil           | string                                              | no       |
        | status               | string                                              | no       |
        | redirectInsteadOfQr  | boolean                                             | no       |
        | redirectToUrl        | string                                              | no       |
        | gpsActivationEnabled | boolean                                             | no       |
        | locationRadiusMeters | number                                              | no       |
        | redemptionType       | in_store_qr, online_redirect                       | no       |
        | fulfillmentType      | physical_store, online                             | no       |
        | geoRedemption        | GeoRedemption                                      | no       |
