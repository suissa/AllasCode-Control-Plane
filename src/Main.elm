module Main exposing (main)

import Browser
import Html exposing (Html, div, h1, p, text)
import Html.Attributes exposing (class)


type alias Model =
    ()


type Msg
    = NoOp


main : Program () Model Msg
main =
    Browser.sandbox
        { init = ()
        , update = update
        , view = view
        }


update : Msg -> Model -> Model
update _ model =
    model


view : Model -> Html Msg
view _ =
    div
        [ class "min-h-screen bg-paper px-6 py-12 text-ink" ]
        [ h1 [ class "font-display text-4xl" ]
            [ text "AllasCode Ecosystem Control Plane" ]
        , p [ class "mt-4 max-w-2xl text-base" ]
            [ text "Elm frontend entrypoint. Domain data and Control Plane API integration are intentionally not implemented in this bootstrap." ]
        ]
