;; EventMint Contract
(impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-invalid-event (err u101))
(define-constant err-event-ended (err u102))
(define-constant err-already-minted (err u103))

;; Define NFT token
(define-non-fungible-token event-nft uint)

;; Data variables
(define-data-var last-token-id uint u0)
(define-data-var last-event-id uint u0)

;; Event data maps
(define-map events uint {
    name: (string-ascii 256),
    description: (string-ascii 1024),
    start-time: uint,
    end-time: uint,
    organizer: principal,
    max-supply: uint,
    current-supply: uint
})

(define-map token-metadata uint {
    event-id: uint,
    owner: principal,
    mint-time: uint
})

;; Create new event
(define-public (create-event (name (string-ascii 256)) 
                           (description (string-ascii 1024))
                           (start-time uint)
                           (end-time uint)
                           (max-supply uint))
    (let ((event-id (+ (var-get last-event-id) u1)))
        (if (is-eq tx-sender contract-owner)
            (begin
                (map-set events event-id {
                    name: name,
                    description: description,
                    start-time: start-time,
                    end-time: end-time,
                    organizer: tx-sender,
                    max-supply: max-supply,
                    current-supply: u0
                })
                (var-set last-event-id event-id)
                (ok event-id))
            err-owner-only)))

;; Mint event NFT
(define-public (mint-event-nft (event-id uint))
    (let ((event (unwrap! (map-get? events event-id) err-invalid-event))
          (token-id (+ (var-get last-token-id) u1)))
        (asserts! (<= block-height (get end-time event)) err-event-ended)
        (asserts! (< (get current-supply event) (get max-supply event)) err-already-minted)
        (try! (nft-mint? event-nft token-id tx-sender))
        (map-set token-metadata token-id {
            event-id: event-id,
            owner: tx-sender,
            mint-time: block-height
        })
        (map-set events event-id (merge event {
            current-supply: (+ (get current-supply event) u1)
        }))
        (var-set last-token-id token-id)
        (ok token-id)))

;; Transfer NFT
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) err-owner-only)
        (nft-transfer? event-nft token-id sender recipient)))

;; Get event details
(define-read-only (get-event-details (event-id uint))
    (map-get? events event-id))

;; Get token details
(define-read-only (get-token-details (token-id uint))
    (map-get? token-metadata token-id))

;; Get owner
(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? event-nft token-id)))