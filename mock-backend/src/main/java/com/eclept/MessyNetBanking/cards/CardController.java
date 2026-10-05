package com.eclept.MessyNetBanking.cards;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.eclept.MessyNetBanking.cards.CardDtos.BlockRequest;
import com.eclept.MessyNetBanking.cards.CardDtos.BlockResult;
import com.eclept.MessyNetBanking.cards.CardDtos.CardItem;
import com.eclept.MessyNetBanking.cards.CardDtos.CardList;
import com.eclept.MessyNetBanking.cards.CardDtos.GetCardsRequest;
import com.eclept.MessyNetBanking.common.SerbianFormat;
import com.eclept.MessyNetBanking.common.ValidationErrors;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@Tag(name = "cards")
public class CardController {

    private final CardRepository cards;

    public CardController(CardRepository cards) {
        this.cards = cards;
    }

    @PostMapping("/cards/getCards")
    @Operation(summary = "List cards (a read via POST)",
            description = "POST with a `clientId` body whose value is ignored. RPC-style path. Wrapped in `cardList`. "
                    + "`blocked` is \"Y\"/\"N\". `limit` is a sr-RS string or null.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = CardList.class)))
    public CardList getCards(@RequestBody(required = false) GetCardsRequest request) {
        return new CardList(cards.findAll().stream()
                .map(c -> new CardItem(c.pan(), c.expiry(), c.type(), c.linkedAcc(), c.blocked() ? "Y" : "N",
                        c.limit() == null ? null : SerbianFormat.amount(c.limit())))
                .toList());
    }

    @PostMapping("/cards/block")
    @Operation(summary = "Block / unblock a card",
            description = "`block` is \"Y\" or \"N\". Card identified by its **masked** PAN. Unknown PAN still returns "
                    + "HTTP 200, with {\"result\":\"NOK\"}.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = BlockResult.class)))
    @ApiResponse(responseCode = "422", content = @Content(schema = @Schema(implementation = ValidationErrors.class)))
    public BlockResult block(@Valid @RequestBody BlockRequest request) {
        return cards.setBlocked(request.pan(), "Y".equals(request.block()))
                .map(c -> new BlockResult("OK"))
                .orElse(new BlockResult("NOK"));
    }
}
