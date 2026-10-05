package com.eclept.MessyNetBanking.accounts;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.eclept.MessyNetBanking.accounts.AccountDtos.AccountListItem;
import com.eclept.MessyNetBanking.accounts.AccountDtos.Balance;
import com.eclept.MessyNetBanking.common.ApiError;
import com.eclept.MessyNetBanking.common.ApiException;
import com.eclept.MessyNetBanking.common.SerbianFormat;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "accounts")
public class AccountController {

    private final AccountRepository accounts;

    public AccountController(AccountRepository accounts) {
        this.accounts = accounts;
    }

    @GetMapping("/core/v2/acc/list")
    @Operation(summary = "List accounts",
            description = "Bare JSON array, no wrapper. **No balances.** Field names mix snake_case (`acc_no`), "
                    + "UPPERCASE (`IBAN`) and abbreviations (`descr`, `ccy`). Codes: prodType TR/ST/KK, status A/B. "
                    + "`openDt` has no timezone. `descr` may be null.")
    @ApiResponse(responseCode = "200",
            content = @Content(array = @ArraySchema(schema = @Schema(implementation = AccountListItem.class))))
    public List<AccountListItem> list() {
        return accounts.findAll().stream()
                .map(a -> new AccountListItem(a.accNo(), a.iban(), a.descr(), a.prodType(), a.ccy(), a.status(),
                        SerbianFormat.localDateTime(a.openDt())))
                .toList();
    }

    @GetMapping("/core/v2/acc/{accNo}/bal")
    @Operation(summary = "Account balance",
            description = "Different names for the same things than /list (`accountNumber` vs `acc_no`, `currency` vs "
                    + "`ccy`). Amounts are **strings in Serbian locale** (\"185.000,00\"). Unknown account: 404 "
                    + "{\"code\":\"ACC_NOT_FOUND\"}.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = Balance.class)))
    @ApiResponse(responseCode = "404", content = @Content(schema = @Schema(implementation = ApiError.class)))
    public Balance balance(@PathVariable String accNo) {
        Account account = accounts.find(accNo).orElseThrow(ApiException::accountNotFound);
        synchronized (account) {
            return new Balance(account.accNo(), SerbianFormat.amount(account.available()),
                    SerbianFormat.amount(account.booked()), account.ccy());
        }
    }
}
